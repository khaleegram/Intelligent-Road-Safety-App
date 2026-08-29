# SafeDrive NG — Project Setup & Go-Live

Local and ops setup for **SafeDrive NG** (research title: *Developing an Integrated Model to Enhance Road Safety and Promote Urban Resilience in Nigeria*).

## Prerequisites

- Node.js LTS
- Java 21+ (only for Firestore rules tests)
- Expo CLI (via npx)
- Firebase project (Firestore + Email/Password Auth)
- Mapbox account (public token + secret download token)
- Android Studio / Xcode for native Mapbox builds

## Repo layout

- `apps/mobile` — Expo SafeDrive NG app
- `backend/firebase` — Firestore rules, indexes, admin bootstrap
- `backend/pipeline` — Hotspot computation + push notify
- `backend/ml` — Dataset import, training, risk publish
- `backend/research` — SEM CSV export
- `docs` — Architecture, roadmap, go-live, production readiness

## 1. Mobile environment

Copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill **all** keys:

```
EXPO_PUBLIC_MAPBOX_TOKEN=pk....
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk....
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...
EXPO_PUBLIC_ADMIN_ROLE_ENDPOINT=   # optional until Cloud Run admin API is live
EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=  # optional, __DEV__ App Check
```

Root `.env.example` mirrors the same mobile keys for convenience.

## 2. Firebase foundation

See [backend/firebase/README.md](../backend/firebase/README.md):

1. Enable Firestore + Email/Password Auth in Console.
2. Set `.firebaserc` project id.
3. Deploy rules/indexes.
4. Set `GOOGLE_APPLICATION_CREDENTIALS` (or `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`).
5. Sign up in the app, then `node backend/firebase/scripts/bootstrap-admin.mjs --email you@example.com`.

## 3. Run mobile (dev client required for Mapbox)

```powershell
cd apps/mobile
npm install
npx expo prebuild
npx expo run:android
# or: npx expo run:ios
```

Expo Go does **not** support `@rnmapbox/maps`. Use a development build.

Smoke checklist: [docs/SMOKE_TEST.md](SMOKE_TEST.md).

## 4. Data + analytical loop

```powershell
# Synthetic bootstrap (default go-live)
cd apps/mobile
npm run seed:accidents -- --count 1400

# Hotspots
cd ..\..\backend\pipeline
npm install
npm run hotspots -- --threshold 3 --grid 0.01

# Advisory risk_predictions for Map banner
cd ..\ml
npm install
npm run publish:risk

# Or research dataset:
# npm run import:dataset -- --input "C:\path\RoadSafety_Dataset.xlsx"
```

Schedule: GitHub Actions workflow `Hotspot Pipeline` (every 6h + manual). Secrets: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

## 5. SEM research export

```powershell
cd backend/research
npm install
npm run export:sem
```

See [docs/research/SEM.md](research/SEM.md).

## 6. Languages and theme

English, Hausa, Yoruba, Igbo. Theme: system / light / dark (Settings).

## Full checklist

See [docs/GO_LIVE.md](GO_LIVE.md).
