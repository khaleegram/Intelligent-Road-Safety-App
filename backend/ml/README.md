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
