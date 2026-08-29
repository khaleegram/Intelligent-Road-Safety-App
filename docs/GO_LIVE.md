# SafeDrive NG Go-Live Checklist

Follow in order. Defaults: **GitHub Actions** for scheduling; **synthetic seed** until `RoadSafety_Dataset.xlsx` is available.

## Sprint 1 — Firebase foundation

- [ ] Firebase project created
- [ ] Firestore enabled
- [ ] Auth Email/Password enabled
- [ ] `apps/mobile/.env` filled from `.env.example`
- [ ] `backend/firebase/.firebaserc` project id set
- [ ] `npx firebase deploy --only firestore:rules,firestore:indexes` succeeded
- [ ] Service account credentials available (`GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_*`)
- [ ] First user signed up in app
- [ ] Admin granted: `node backend/firebase/scripts/bootstrap-admin.mjs --email <you>`

## Sprint 2 — Dev client

- [ ] `cd apps/mobile && npm install`
- [ ] `npx expo prebuild`
- [ ] `npx expo run:android` (or iOS)
- [ ] Map renders with Mapbox token
- [ ] Smoke tests in [SMOKE_TEST.md](SMOKE_TEST.md) pass

## Sprint 3 — Data brain

- [ ] Seed or import accidents
- [ ] Hotspots written (`npm run hotspots` in `backend/pipeline`)
- [ ] `npm run publish:risk` in `backend/ml`
- [ ] Map shows hotspots + ML advisory banner
- [ ] GitHub secrets set for Hotspot Pipeline workflow
- [ ] Manual `workflow_dispatch` of Hotspot Pipeline succeeds

## Sprint 4 — SEM

- [ ] `npm run export:sem` in `backend/research`
- [ ] CSV appears under `backend/research/output/`
- [ ] Columns match [research/SEM.md](research/SEM.md)

## Sprint 5 — Production hardening

- [ ] App Check debug token tested in `__DEV__` (optional)
- [ ] App Check providers enabled in Firebase Console for release builds
- [ ] Push token saved on user profile after notification permission
- [ ] Monitoring notes in [production-readiness.md](production-readiness.md) followed
- [ ] Firestore scheduled export / backup configured in GCP Console
