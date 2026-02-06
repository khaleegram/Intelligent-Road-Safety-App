# Cloud Run + Cloud Scheduler (Production)

This is the professional setup to update hotspots **without rebuilding the app**.

## Overview
- Containerized hotspot pipeline runs on **Cloud Run**.
- **Cloud Scheduler** triggers the pipeline via HTTP.
- Cloud Run uses **Application Default Credentials** (no keys in repo).

## 1) Build & Deploy Cloud Run service
From repo root:

```bash
cd backend/pipeline

gcloud run deploy roadsafe-hotspots \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars HOTSPOT_THRESHOLD=3,HOTSPOT_GRID=0.01,HOTSPOT_TIME_BUCKET=all
```

> Note: For stricter security, do NOT allow unauthenticated. Use Cloud Scheduler with an OIDC token (below).

## 2) Lock down with a service account (recommended)

```bash
gcloud iam service-accounts create roadsafe-hotspot-runner \
  --display-name "RoadSafe Hotspot Runner"

# Grant Firestore access
PROJECT_ID=$(gcloud config get-value project)

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member "serviceAccount:roadsafe-hotspot-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/datastore.user"

# Update Cloud Run to use this account and require auth

gcloud run services update roadsafe-hotspots \
  --region us-central1 \
  --service-account roadsafe-hotspot-runner@$PROJECT_ID.iam.gserviceaccount.com \
  --no-allow-unauthenticated
```

## 3) Create Cloud Scheduler job

```bash
SERVICE_URL=$(gcloud run services describe roadsafe-hotspots \
  --region us-central1 \
  --format 'value(status.url)')

# Create scheduler job with OIDC auth

gcloud scheduler jobs create http roadsafe-hotspots-job \
  --schedule "0 */6 * * *" \
  --uri "$SERVICE_URL/run" \
  --http-method POST \
  --oidc-service-account-email roadsafe-hotspot-runner@$PROJECT_ID.iam.gserviceaccount.com \
  --headers "Content-Type=application/json" \
  --message-body '{"threshold":3,"grid":0.01,"time_bucket":"all","verified":false}'
```

## 4) Test

```bash
curl -X POST "$SERVICE_URL/run" -H "Content-Type: application/json" \
  -d '{"threshold":3,"grid":0.01,"time_bucket":"all"}'
```

## Notes
- Cloud Run uses ADC automatically; no JSON key required.
- Adjust threshold/grid without app rebuilds.
