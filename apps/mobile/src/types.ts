export type AccidentSeverity = 'Fatal' | 'Critical' | 'Minor' | 'Damage Only';

export type AccidentFeatures = {
  lighting_condition?: string;
  road_surface?: string;
  traffic_density?: string;
  suspected_cause?: string;
};

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
  /** App-only payload; written to `accident_features/{request_id}`, never to `accidents`. */
  features?: AccidentFeatures;
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
  /** When the hotspot pipeline last ran. */
  computed_at?: string;
  /** Newest accident timestamp included in this pipeline run. */
  data_through?: string;
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

export type AlertPreferences = {
  enabled: boolean;
  radiusMeters: number;
};

export type LocalAlert = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  type: string;
};

export type EmergencyContact = {
  id?: string;
  name: string;
  phone: string;
  relationship?: string;
  created_at?: string;
};

export type RiskPrediction = {
  cell_id: string;
  center_lat: number;
  center_lng: number;
  risk_score: number;
  model_version: string;
  updated_at: string;
  advisory_only: boolean;
};

export type SemFitMetrics = {
  cfi?: number;
  tli?: number;
  rmsea?: number;
  srmr?: number;
};

export type SemInsight = {
  id?: string;
  model_version?: string;
  updated_at?: string;
  fit?: SemFitMetrics;
  path_coefficients?: Record<string, number>;
  policy_recommendations?: string[];
};

export type BehaviourTrip = {
  id: string;
  uid: string;
  started_at: string;
  ended_at: string;
  score: number;
  harsh_events: number;
  distance_m: number;
  consent_version: string;
};

export type WeatherSnapshot = {
  tempC: number;
  windKmh: number;
  code: number;
  conditionKey:
    | 'Clear'
    | 'Cloudy'
    | 'Fog'
    | 'Drizzle'
    | 'Rain'
    | 'Snow'
    | 'Thunderstorm'
    | 'Unknown';
};

export type EducationArticle = {
  id: string;
  category: 'speeding' | 'seatbelts' | 'night' | 'weather' | 'intersections';
  title: string;
  body: string;
};

export type MedicationEntry = {
  id: string;
  names: string[];
  level: 'safe' | 'caution' | 'avoid';
  advice_en: string;
  advice_ha: string;
  advice_yo: string;
  advice_ig: string;
};
