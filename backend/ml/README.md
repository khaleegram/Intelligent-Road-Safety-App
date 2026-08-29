# ML Phase 1: Data Export + Baseline Model

This folder contains:
- Firestore export script (CSV/JSON)
- Baseline model training script (for pipeline validation)

## Setup

```bash
cd backend/ml
npm install
```

For training (Python):

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## Export data

```bash
node export-accidents.mjs --out exports --format csv
```

Optional flags:
- `--verified`
- `--time-bucket last_30d` or `last_90d`

## Import real research dataset (.xlsx)

Use this to import `RoadSafety_Dataset.xlsx` into:
- `accidents` (core app records)
- `accident_features` (rich ML/research fields)
- `dataset_import_runs` (audit metadata)

Dry run first:

```bash
node import-dataset.mjs --input "C:\Users\User\Downloads\RoadSafety_Dataset.xlsx" --dry-run
```

Write to Firestore and refresh hotspots:

```bash
node import-dataset.mjs --input "C:\Users\User\Downloads\RoadSafety_Dataset.xlsx"
```

Common options:
- `--sheet Sheet1`
- `--source road_safety_research_dataset_v1`
- `--reporter-uid dataset_import_v1`
- `--verified-by dataset_import_v1`
- `--batch-size 350`
- `--threshold 3`
- `--grid 0.01`
- `--time-bucket all | last_30d | last_90d`
- `--hotspots-verified`
- `--skip-hotspots`

## Train baseline model (validation only)

```bash
python train-baseline.py --input exports/accidents_YYYYMMDD.csv --grid 0.01 --threshold 3
```

Outputs:
- `backend/ml/model_registry/model_<timestamp>.pkl`
- `backend/ml/model_registry/model_<timestamp>.json`

**Note:** This baseline is only to validate the pipeline, not production ML.
Treat all outputs as advisory until you add:
- versioned model registry with promotion/rollback
- evaluation thresholds (precision/recall targets) on held-out data
- post-deploy monitoring and drift checks

Also avoid leakage when selecting model inputs:
- `route_risk_score`
- `crash_hotspot_proximity_km`
- `historical_crash_density`
- `blackspot_classification`

## Publish advisory risk predictions (mobile Map)

After hotspot computation (or baseline training), publish cells to Firestore `risk_predictions` for the SafeDrive NG Map advisory banner:

```bash
node publish-risk-predictions.mjs
```

Optional: `ML_MODEL_VERSION=baseline-gb-v1`

The mobile app reads these as advisory only (`advisory_only: true`). Do not use them for automated enforcement.

## Import tests

```bash
npm run test:import
```

## Credentials
Uses the same credential resolution as the pipeline:
- `GOOGLE_APPLICATION_CREDENTIALS` (recommended), or
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, or
- Application Default Credentials (Cloud Run / GCP)

## Dedupe logic
We dedupe by:
- 5-minute time bucket
- latitude/longitude rounded to 3 decimals (~100m)

You can tighten or loosen this later based on data quality.
