const severityLookup = new Map([
  ['FATAL', 'Fatal'],
  ['CRITICAL', 'Critical'],
  ['MINOR', 'Minor'],
  ['DAMAGE', 'Damage Only'],
  ['DAMAGE ONLY', 'Damage Only'],
]);

const numericFeatureFields = new Set([
  'timestamp',
  'date',
  'month',
  'year',
  'latitude',
  'longitude',
  'distance_to_hospital_km',
  'distance_to_police_km',
  'distance_to_fire_service_km',
  'speed_limit',
  'congestion_index',
  'average_speed',
  'vehicle_flow_estimate',
  'rainfall_intensity',
  'temperature',
  'visibility_index',
  'vehicles_involved',
  'casualties_count',
  'ambulance_response_time_min',
  'police_response_time_min',
  'daily_traffic_volume',
  'vehicle_km_travelled',
  'peak_hour_index',
  'freight_mobility_share',
  'route_risk_score',
  'road_condition_index',
  'crash_hotspot_proximity_km',
  'historical_crash_density',
  'seasonal_risk_factor',
  'traffic_signal_density',
  'road_markings_quality',
  'street_lighting_index',
  'pedestrian_facility_score',
  'emergency_response_time_min',
  'nearest_hospital_distance_km',
  'ambulance_availability_index',
  'firstresponder_coverage',
  'policy_enforcement_index',
  'road_safety_campaign_intensity',
  'traffic_law_compliance_rate',
  'funding_level_for_roadsafety',
]);

const booleanFeatureFields = new Set([
  'holiday_flag',
  'peak_hour_flag',
  'construction_zone_flag',
  'harmattan_flag',
  'fog_flag',
  'alcohol_suspected',
  'phone_distraction',
  'fatigue_flag',
  'pedestrian_involved',
  'alternative_route_availability',
  'realtime_navigation_use',
]);

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const toNumber = (value) => {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = cleanString(value);
  if (text.length === 0) return null;
  const normalized = text.replace(/,/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
};

const toNonNegativeInt = (value) => {
  const number = toNumber(value);
  if (number == null) return null;
  const rounded = Math.round(number);
  if (rounded < 0) return null;
  return rounded;
};

const toBoolean = (value) => {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  const text = cleanString(value).toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(text)) return true;
  if (['0', 'false', 'no', 'n'].includes(text)) return false;
  return null;
};

const toIsoFromExcelSerial = (value) => {
  const serial = toNumber(value);
  if (serial == null) return null;
  const millis = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const toDatePart = (value) => {
  const fromSerial = toIsoFromExcelSerial(value);
  if (fromSerial) return fromSerial.slice(0, 10);
  const text = cleanString(value);
  if (text.length === 0) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const toTimePart = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') {
    const seconds = Math.round(value * 24 * 60 * 60);
    const hh = String(Math.floor(seconds / 3600) % 24).padStart(2, '0');
    const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  const text = cleanString(value);
  if (text.length === 0) return null;
  const hhmmss = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
  const match = hhmmss.exec(text);
  if (!match) return null;
  const hh = String(Number(match[1])).padStart(2, '0');
  const mm = match[2];
  const ss = (match[3] ?? '00').padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

export const normalizeHeaderKey = (value) => {
  const text = cleanString(value);
  if (text.length === 0) return '';
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
};

export const normalizeSeverity = (value) => {
  const text = cleanString(value).toUpperCase().replace(/\s+/g, ' ');
  if (text.length === 0) return null;
  return severityLookup.get(text) ?? null;
};

export const parseDatasetTimestamp = (row) => {
  const fromTimestamp = toIsoFromExcelSerial(row.timestamp);
  if (fromTimestamp) return fromTimestamp;

  const timestampText = cleanString(row.timestamp);
  if (timestampText.length > 0) {
    const parsed = new Date(timestampText);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const datePart = toDatePart(row.date);
  if (!datePart) return null;
  const timePart = toTimePart(row.time) ?? '00:00:00';
  const composed = new Date(`${datePart}T${timePart}Z`);
  if (Number.isNaN(composed.getTime())) return null;
  return composed.toISOString();
};

const normalizeFeatureValue = (key, value) => {
  if (value == null) return null;

  if (booleanFeatureFields.has(key)) {
    return toBoolean(value);
  }

  if (numericFeatureFields.has(key)) {
    return toNumber(value);
  }

  const text = cleanString(value);
  return text.length > 0 ? text : null;
};

const normalizeFeaturePayload = (row) => {
  const payload = {};
  for (const [rawKey, rawValue] of Object.entries(row)) {
    const normalizedKey = normalizeHeaderKey(rawKey);
    if (normalizedKey.length === 0) continue;
    payload[normalizedKey] = normalizeFeatureValue(normalizedKey, rawValue);
  }
  return payload;
};

const isNigeriaCoordinate = (lat, lng) => {
  return lat >= 3.5 && lat <= 14.5 && lng >= 2.5 && lng <= 15.5;
};

export const normalizeDatasetRow = (row, options = {}) => {
  const requestId = cleanString(row.incident_id || row.request_id);
  if (!requestId) {
    return { ok: false, reason: 'missing_request_id' };
  }

  const latitude = toNumber(row.latitude);
  const longitude = toNumber(row.longitude);
  if (latitude == null || longitude == null) {
    return { ok: false, reason: 'invalid_coordinates' };
  }
  if (!isNigeriaCoordinate(latitude, longitude)) {
    return { ok: false, reason: 'outside_nigeria_bounds' };
  }

  const timestampIso = parseDatasetTimestamp(row);
  if (!timestampIso) {
    return { ok: false, reason: 'invalid_timestamp' };
  }

  const severity = normalizeSeverity(row.severity_class || row.severity);
  if (!severity) {
    return { ok: false, reason: 'invalid_severity' };
  }

  const roadType = cleanString(row.road_type);
  if (!roadType) {
    return { ok: false, reason: 'missing_road_type' };
  }

  const weather = cleanString(row.weather_type || row.weather);
  if (!weather) {
    return { ok: false, reason: 'missing_weather' };
  }

  const vehicleCount = toNonNegativeInt(row.vehicles_involved ?? row.vehicle_count);
  if (vehicleCount == null) {
    return { ok: false, reason: 'invalid_vehicle_count' };
  }

  const casualtyCount = toNonNegativeInt(row.casualties_count ?? row.casualty_count);
  if (casualtyCount == null) {
    return { ok: false, reason: 'invalid_casualty_count' };
  }

  const importedAt = options.importedAt ?? new Date().toISOString();
  const sourceDataset = options.sourceDataset ?? 'research_dataset_v1';
  const runId = options.importRunId ?? '';
  const reporterUid = options.reporterUid ?? 'dataset_import_v1';
  const verifiedBy = options.verifiedBy ?? reporterUid;

  const accident = {
    request_id: requestId,
    latitude,
    longitude,
    timestamp: timestampIso,
    severity,
    road_type: roadType,
    weather,
    vehicle_count: vehicleCount,
    casualty_count: casualtyCount,
    created_at: timestampIso,
    reporter_uid: reporterUid,
    verified: true,
    verified_by: verifiedBy,
    verified_at: importedAt,
    notes: `Imported from ${sourceDataset}`,
  };

  const features = {
    ...normalizeFeaturePayload(row),
    request_id: requestId,
    timestamp_iso: timestampIso,
    severity_normalized: severity,
    source_dataset: sourceDataset,
    import_run_id: runId,
    imported_at: importedAt,
  };

  return {
    ok: true,
    requestId,
    accident,
    features,
  };
};
