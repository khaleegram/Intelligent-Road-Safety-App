import type { AccidentRecord, AccidentSeverity } from '../types';

export type ReportDraft = {
  latitude: string;
  longitude: string;
  severity: AccidentSeverity;
  roadType: string;
  weather: string;
  vehicleCount: number;
  casualtyCount: number;
  timestamp?: string;
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
  };
}
