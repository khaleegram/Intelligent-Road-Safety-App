# Data Contract (SafeDrive NG)

This file locks the import contract for `RoadSafety_Dataset.xlsx` and documents app / planned collections.

## Collections (current)

- `accidents/{request_id}`: app-facing core records used by map, alerts, and hotspot pipeline.
- `accident_features/{request_id}`: rich research/ML fields from dataset import.
- `dataset_import_runs/{run_id}`: import audit metadata and outcomes.
- `hotspots/{area_id}`: computed hotspot cells.
- `users/{uid}`: profile, admin flag, preferences.
- `admin_alerts/{id}`: operational spike / admin alerts.

## Collections (planned stubs)

### `users/{uid}/emergency_contacts/{contactId}`

- `name` (string)
- `phone` (string)
- `relationship` (string, optional)
- `created_at` (ISO string)

### `feedback/{id}`

- `uid` (string)
- `message` (string)
- `rating` (number 1–5, optional)
- `created_at` (ISO string)
- `locale` (string)

### `education_progress/{uid}`

- `read_ids` (string[])
- `updated_at` (ISO string)

### `risk_predictions/{cellId}` (ML serving)

- `center_lat` / `center_lng` (number)
- `risk_score` (number)
- `model_version` (string)
- `updated_at` (ISO string)
- `advisory_only` (boolean, always true for v1)

### `behaviour_trips/{tripId}`

- `uid` (string)
- `started_at` / `ended_at` (ISO string)
- `score` (number)
- `harsh_events` (number)
- `distance_m` (number)
- `consent_version` (string)

Medication catalog and education articles ship as **static app content** (not Firestore) in v1.

## Core Accident Schema (`accidents`)

Required:

- `request_id` (string, equals document id)
- `latitude` (number)
- `longitude` (number)
- `timestamp` (ISO string)
- `severity` (`Fatal` | `Critical` | `Minor` | `Damage Only`)
- `road_type` (string)
- `weather` (string)
- `vehicle_count` (number)
- `casualty_count` (number)
- `created_at` (ISO string)
- `reporter_uid` (string)

Optional (admin flow):

- `verified` (boolean)
- `verified_by` (string)
- `verified_at` (ISO string)
- `notes` (string)

Optional (weather enrichment):

- `weather_snapshot` (object: temp_c, wind_kmh, code, fetched_at)

## Mapping (Dataset → App)

- `incident_id` → `request_id`
- `latitude` → `latitude`
- `longitude` → `longitude`
- `severity_class` → `severity` (normalize `Damage` → `Damage Only`)
- `road_type` → `road_type`
- `weather_type` → `weather`
- `vehicles_involved` → `vehicle_count`
- `casualties_count` → `casualty_count`
- `timestamp`/`date`/`time` → `timestamp` (ISO)
- `created_at` → uses normalized `timestamp` for historical integrity
- `reporter_uid` → import identity (default `dataset_import_v1`)

All dataset columns are additionally stored in `accident_features` with normalized snake_case keys.

## Normalization Rules

- Convert Excel serial datetime values to ISO UTC.
- Trim categorical strings.
- Severity normalization:
  - `Fatal` → `Fatal`
  - `Critical` → `Critical`
  - `Minor` → `Minor`
  - `Damage` / `Damage Only` → `Damage Only`
- Parse numeric fields as numbers.
- Parse binary flags (`0/1`, `true/false`, `yes/no`) as booleans where applicable.

## Row Validation Rules

Hard-fail row (skip import row) when:

- missing `incident_id`
- invalid/missing latitude or longitude
- out-of-Nigeria coordinates
- invalid/unparseable timestamp
- invalid severity
- missing road type
- missing weather
- invalid vehicle/casualty counts

Duplicate `incident_id` values are skipped after first occurrence.

## ML Feature Guidance

Fields that are useful as model inputs remain in `accident_features`.

Leakage-risk fields should not be model inputs for predictive training:

- `route_risk_score`
- `crash_hotspot_proximity_km`
- `historical_crash_density`
- `blackspot_classification`

## Reporting Form Scope

Keep reporting short for data quality:

- Keep current required report fields in app.
- Optional additions later: `lighting_condition`, `road_surface`, `traffic_density`, `suspected_cause`.
- Do not expose full 83-column dataset in user report form.
