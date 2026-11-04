import type {
  AccidentFeatures,
  AccidentRecord,
  AccidentSeverity,
} from '../types';

export type ReportDraft = {
  latitude: string;
  longitude: string;
  severity: AccidentSeverity;
  roadType: string;
  weather: string;
  vehicleCount: number;
  casualtyCount: number;
  timestamp?: string;
  features?: AccidentFeatures;
};

export type ReportValidationError =
  | 'invalid_location'
  | 'missing_road_type'
  | 'missing_weather'
  | 'invalid_counts';

export function validateReportDraft(
  draft: ReportDraft
): { ok: true; lat: number; lng: number } | { ok: false; code: ReportValidationError } {
  const lat = Number(draft.latitude);
  const lng = Number(draft.longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, code: 'invalid_location' };
  }
  if (!draft.roadType.trim()) {
    return { ok: false, code: 'missing_road_type' };
  }
  if (!draft.weather.trim()) {
    return { ok: false, code: 'missing_weather' };
  }
  if (draft.vehicleCount < 0 || draft.casualtyCount < 0) {
    return { ok: false, code: 'invalid_counts' };
  }

  return { ok: true, lat, lng };
}

export function buildAccidentRecord(draft: ReportDraft, nowIso: string): AccidentRecord {
  const result = validateReportDraft(draft);
  if (!result.ok) {
    throw new Error(`Invalid report draft: ${result.code}`);
  }

  const features = cleanFeatures(draft.features);

  return {
    latitude: result.lat,
    longitude: result.lng,
    timestamp: draft.timestamp?.trim() ? draft.timestamp.trim() : nowIso,
    severity: draft.severity,
    road_type: draft.roadType.trim(),
    weather: draft.weather.trim(),
    vehicle_count: draft.vehicleCount,
    casualty_count: draft.casualtyCount,
    created_at: nowIso,
    ...(features ? { features } : {}),
  };
}

export function cleanFeatures(
  features?: AccidentFeatures
): AccidentFeatures | undefined {
  if (!features) return undefined;
  const cleaned: AccidentFeatures = {};
  for (const key of [
    'lighting_condition',
    'road_surface',
    'traffic_density',
    'suspected_cause',
  ] as const) {
    const value = features[key]?.trim();
    if (value) {
      cleaned[key] = value;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
