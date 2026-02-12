# Backend hotspot pipeline

This folder contains a server-side baseline hotspot pipeline. It lets you update hotspot data **without rebuilding the mobile app**.

## Security (required)
**Do not commit service account keys.** Keep them out of git.

Two supported ways:
- **Preferred**: JSON file + `GOOGLE_APPLICATION_CREDENTIALS`
- **Alternative**: env vars (stored in a local-only `.env.local`)

## Option A (recommended): JSON file
1) Store the key outside the repo, e.g. `C:\Secure\firebase\serviceAccount.json`
2) Set:

```bash
set GOOGLE_APPLICATION_CREDENTIALS=C:\Secure\firebase\serviceAccount.json
```

## Option B: env vars (.env.local, not committed)
Create `backend/pipeline/.env.local` (gitignored) with:

```
FIREBASE_PROJECT_ID=intelligent-road-safety
FIREBASE_CLIENT_EMAIL=your-service-account@intelligent-road-safety.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

In PowerShell, load it before running:

```bash
Get-Content .env.local | ForEach-Object { if ($_ -match '^(\w+)=(.*)$') { $env:$($matches[1])=$matches[2].Trim('"') } }
```

## Prerequisites
- Node 18+.

## Setup

```bash
cd backend/pipeline
npm install
```

## Run
Dry run (no writes):

```bash
npm run hotspots -- --dry-run --threshold 3 --grid 0.01
```

Write hotspots:

```bash
npm run hotspots -- --threshold 3 --grid 0.01
```

Optional flags:
- `--verified` : only use verified accidents
- `--time-bucket last_30d` or `last_90d`

## What it does
- Reads accidents from Firestore
- Aggregates into grid cells
- Writes computed hotspots to `hotspots` collection (with explanation fields)
- Writes spike alerts to `admin_alerts` when 24h report volume exceeds `ALERT_SPIKE_THRESHOLD` (default `5`)

This makes the app update **without any rebuild**.

## Admin role endpoint
If you run `node server.mjs`, you also get:
- `POST /run` -> execute hotspot pipeline
- `POST /admin/roles` -> grant/revoke admin roles securely

`/admin/roles` requirements:
- Bearer Firebase ID token of an existing admin user
- JSON body:
```json
{
  "targetUid": "user_uid_here",
  "isAdmin": true
}
```
