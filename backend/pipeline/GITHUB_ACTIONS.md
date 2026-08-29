# GitHub Actions (No Billing)

Runs the SafeDrive NG analytical loop on a schedule using GitHub Actions:

1. Compute hotspots  
2. Publish advisory `risk_predictions`  
3. Notify devices with Expo push tokens  

## 1) Add secrets to your GitHub repo

**Settings → Secrets and variables → Actions → New repository secret:**

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

For `FIREBASE_PRIVATE_KEY`, paste with real line breaks, or use `\n` (pipeline normalizes).

## 2) Workflow file

[`.github/workflows/hotspot-pipeline.yml`](../../.github/workflows/hotspot-pipeline.yml)

- Cron: every 6 hours  
- Manual: Actions → Hotspot Pipeline → Run workflow  

## 3) Local equivalent

```powershell
# From repo root, with credentials in env:
node scripts/run-data-loop.mjs
node scripts/run-data-loop.mjs --skip-push
```

## 4) Change schedule

Edit the `cron` in `.github/workflows/hotspot-pipeline.yml`.
