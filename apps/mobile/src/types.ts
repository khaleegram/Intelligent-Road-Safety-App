export type AccidentSeverity = 'Fatal' | 'Critical' | 'Minor' | 'Damage Only';

export type AccidentRecord = {
  id?: string;
  request_id?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  severity: AccidentSeverity;
  road_type: string;
  weather: string;
  vehicle_count: number;
  casualty_count: number;
  created_at: string;
  reporter_uid?: string;
  verified?: boolean;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
};

export type HotspotSeverity = 'Fatal' | 'Critical' | 'Minor' | 'Damage Only';

export type HotspotRecord = {
  area_id: string;
  center_lat: number;
  center_lng: number;
  risk_score: number;
  severity_level: HotspotSeverity;
  accident_count: number;
  last_updated: string;
  severity_counts?: {
    Fatal?: number;
    Critical?: number;
    Minor?: number;
    'Damage Only'?: number;
  };
  recent_7d_count?: number;
  recent_30d_count?: number;
  model_version?: string;
  time_bucket?: string;
};

export type UserProfile = {
  id?: string;
  email: string;
  created_at?: string;
  last_sign_in?: string;
  is_admin?: boolean;
};

export type AdminAlert = {
  id?: string;
  type: string;
  level: string;
  message: string;
  created_at: string;
  count_24h?: number;
  threshold?: number;
};
