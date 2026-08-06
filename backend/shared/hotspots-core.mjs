const severityWeight = {
  Fatal: 5,
  Critical: 3,
  Minor: 2,
  'Damage Only': 1,
};

export const applyTimeBucket = (timestamp, bucket, nowMs = Date.now()) => {
  if (bucket === 'all') return true;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;
  if (bucket === 'last_30d') {
    const cutoff = nowMs - 30 * 24 * 60 * 60 * 1000;
    return date.getTime() >= cutoff;
  }
  if (bucket === 'last_90d') {
    const cutoff = nowMs - 90 * 24 * 60 * 60 * 1000;
    return date.getTime() >= cutoff;
  }
  return true;
};

const getCellKey = (lat, lng, gridSize) => {
  const latIndex = Math.floor(lat / gridSize);
  const lngIndex = Math.floor(lng / gridSize);
  return `${latIndex}:${lngIndex}`;
};

export const computeHotspots = ({ accidents, threshold, gridSizeDegrees, timeBucket }) => {
  const cells = new Map();
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  for (const accident of accidents) {
    const lat = Number(accident.latitude);
    const lng = Number(accident.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const timestamp = accident.created_at || accident.timestamp || new Date().toISOString();
    if (!applyTimeBucket(timestamp, timeBucket, now)) continue;

    const key = getCellKey(lat, lng, gridSizeDegrees);
    const weight = severityWeight[accident.severity] ?? 1;
    const severity = accident.severity ?? 'Minor';

    const parsedTimestamp = Date.parse(timestamp);
    const ageMs = Number.isNaN(parsedTimestamp) ? Number.POSITIVE_INFINITY : now - parsedTimestamp;
    const existing = cells.get(key);
    if (existing) {
      existing.count += 1;
      existing.riskScore += weight;
      existing.sumLat += lat;
      existing.sumLng += lng;
      existing.severityCounts[severity] = (existing.severityCounts[severity] ?? 0) + 1;
      if (ageMs <= sevenDaysMs) {
        existing.recent_7d_count += 1;
      }
      if (ageMs <= thirtyDaysMs) {
        existing.recent_30d_count += 1;
      }
      existing.maxSeverity = weight >= existing.maxSeverityWeight ? severity : existing.maxSeverity;
      existing.maxSeverityWeight = Math.max(existing.maxSeverityWeight, weight);
      existing.latestTimestamp = existing.latestTimestamp > timestamp ? existing.latestTimestamp : timestamp;
    } else {
      cells.set(key, {
        count: 1,
        riskScore: weight,
        sumLat: lat,
        sumLng: lng,
        severityCounts: {
          Fatal: severity === 'Fatal' ? 1 : 0,
          Critical: severity === 'Critical' ? 1 : 0,
          Minor: severity === 'Minor' ? 1 : 0,
          'Damage Only': severity === 'Damage Only' ? 1 : 0,
        },
        recent_7d_count: ageMs <= sevenDaysMs ? 1 : 0,
        recent_30d_count: ageMs <= thirtyDaysMs ? 1 : 0,
        maxSeverity: severity,
        maxSeverityWeight: weight,
        latestTimestamp: timestamp,
      });
    }
  }

  const hotspots = [];
  for (const [cellId, cell] of cells.entries()) {
    if (cell.count < threshold) continue;
    hotspots.push({
      area_id: cellId,
      center_lat: cell.sumLat / cell.count,
      center_lng: cell.sumLng / cell.count,
      risk_score: cell.riskScore,
      severity_level: cell.maxSeverity,
      accident_count: cell.count,
      last_updated: cell.latestTimestamp,
      severity_counts: cell.severityCounts,
      recent_7d_count: cell.recent_7d_count,
      recent_30d_count: cell.recent_30d_count,
      model_version: 'baseline-v1',
      time_bucket: timeBucket,
    });
  }

  return hotspots;
};
