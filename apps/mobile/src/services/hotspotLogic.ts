import type { AccidentRecord, HotspotRecord, HotspotSeverity } from '../types';

type HotspotLogicConfig = {
  gridSizeDegrees: number;
  threshold: number;
};

const defaultConfig: HotspotLogicConfig = {
  gridSizeDegrees: 0.01,
  threshold: 3,
};

const severityWeight: Record<HotspotSeverity, number> = {
  Fatal: 4,
  Critical: 3,
  Minor: 2,
  'Damage Only': 1,
};

type CellAccumulator = {
  count: number;
  riskScore: number;
  maxSeverity: HotspotSeverity;
  latestTimestamp: string;
  sumLat: number;
  sumLng: number;
};

const getCellKey = (lat: number, lng: number, gridSize: number) => {
  const latIndex = Math.floor(lat / gridSize);
  const lngIndex = Math.floor(lng / gridSize);
  return `${latIndex}:${lngIndex}`;
};

const pickMaxSeverity = (a: HotspotSeverity, b: HotspotSeverity) => {
  return severityWeight[a] >= severityWeight[b] ? a : b;
};

export const computeHotspotsFromAccidents = (
  accidents: AccidentRecord[],
  config: HotspotLogicConfig = defaultConfig
): HotspotRecord[] => {
  const cells = new Map<string, CellAccumulator>();

  for (const accident of accidents) {
    const key = getCellKey(accident.latitude, accident.longitude, config.gridSizeDegrees);
    const existing = cells.get(key);
    const weight = severityWeight[accident.severity];
    const timestamp = accident.created_at || accident.timestamp;

    if (existing) {
      existing.count += 1;
      existing.riskScore += weight;
      existing.maxSeverity = pickMaxSeverity(existing.maxSeverity, accident.severity);
      existing.latestTimestamp =
        existing.latestTimestamp > timestamp ? existing.latestTimestamp : timestamp;
      existing.sumLat += accident.latitude;
      existing.sumLng += accident.longitude;
    } else {
      cells.set(key, {
        count: 1,
        riskScore: weight,
        maxSeverity: accident.severity,
        latestTimestamp: timestamp,
        sumLat: accident.latitude,
        sumLng: accident.longitude,
      });
    }
  }

  const hotspots: HotspotRecord[] = [];

  for (const [area_id, cell] of cells.entries()) {
    if (cell.count < config.threshold) {
      continue;
    }

    const center_lat = cell.sumLat / cell.count;
    const center_lng = cell.sumLng / cell.count;

    hotspots.push({
      area_id,
      center_lat,
      center_lng,
      risk_score: cell.riskScore,
      severity_level: cell.maxSeverity,
      accident_count: cell.count,
      last_updated: cell.latestTimestamp,
    });
  }

  return hotspots;
};
