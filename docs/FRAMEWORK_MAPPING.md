# Framework Mapping

How the project framework's three pillars map onto this repository, and which
pillar this work is responsible for.

| Framework pillar | Owner | Delivered by |
| --- | --- | --- |
| **1. Data acquisition and pre-processing** | Data / research | `backend/ml/*`, `backend/firebase/scripts`, dataset importers |
| **2. Integrated analytical framework (ML + SEM)** | Research | `backend/ml/train-baseline.py`, `backend/pipeline/*`, `backend/research/export-sem-csv.mjs` |
| **3. SafeDrive NG mobile application system** | **This repository's mobile work** | `apps/mobile` |

Pillar 3 is the only pillar implemented in `apps/mobile`. Pillars 1 and 2 run
outside the app; the app consumes their outputs (hotspots, risk predictions)
and exposes an export path for research data.

---

## Pillar 3 — core functional modules

Every module in the framework diagram maps to shipped code.

| Framework module | Implementation |
| --- | --- |
| User Registration & Authentication | `src/screens/AuthScreen.tsx`, `src/services/firebase.ts`, `src/services/userProfile.ts` |
| Real-time GPS Tracking | `src/screens/MapScreen.tsx`, `expo-location` foreground watch |
| Accident Risk Prediction & Hotspot Alerts | `src/services/riskPredictions.ts`, `src/services/firestore.ts`, `src/services/hotspotLogic.ts`, `src/components/AlertBanner.tsx` |
| Weather & Traffic Information | `src/services/weather.ts` (NIMET-style weather snapshot), `src/services/directions.ts` (Mapbox congestion annotation) |
| Medication Safety Checker | `src/screens/MedicationScreen.tsx` + `src/content/medications.*` |
| Driver Behaviour Monitoring | `src/services/behaviour.ts` (trip session, harsh-event detection, score), `src/screens/BehaviourScreen.tsx` |
| Safety Alerts & Notifications | `src/services/notifications.ts` (Expo push token + topic subscription), `src/services/alertPreferences.ts`, `src/screens/NotificationsScreen.tsx` |
| Emergency Contact & SOS | `src/screens/SosScreen.tsx`, `src/services/emergencyContacts.ts` (Firestore + local mirror), toll-free `tel:112` / `tel:122` |
| Road Safety Education & Awareness | `src/screens/EducationScreen.tsx`, `src/content/education.*` (4 locales) |
| Feedback, Reports & Analytics | `src/screens/FeedbackScreen.tsx`, `src/screens/ReportScreen.tsx`, `src/screens/AdminScreen.tsx`, `src/screens/ResearchDataScreen.tsx`, `src/services/exportCsv.ts` |
| Offline functionality (local storage & sync when online) | `src/services/offlineQueue.ts`, `src/services/connectivity.ts`, `src/services/storage.ts` |
| Cloud server & database | Firebase Auth, Firestore, Cloud Functions/pipeline; rules in `backend/firebase/firestore.rules` |

## Research-facing responsibilities of the app

The app does **not** compute SEM. Its only obligations toward pillar 2 are:

1. **Collect** the optional research fields on the report form
   (`lighting_condition`, `road_surface`, `traffic_density`, `suspected_cause`)
   into `accident_features`.
2. **Export** de-identified rows via `backend/research/export-sem-csv.mjs`.
3. **Display** published results read-only (Admin → Research findings), which
   stays empty until the research team publishes to `sem_insights`.

See `docs/research/SEM.md` for the analysis workflow (CFA in AMOS/lavaan,
fit thresholds CFI ≥ 0.90, TLI ≥ 0.90, RMSEA ≤ 0.08, SRMR ≤ 0.08).
