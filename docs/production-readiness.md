# Production Readiness Checklist

Minimum controls before production release of SafeDrive NG.

## Security and Confidentiality

- [x] Require authentication for app access and report submission.
- [x] Restrict Firestore reads for `accidents` and `hotspots` to signed-in users only.
- [x] Use server-trusted admin role (`users/{uid}.is_admin`) only (bootstrap via `backend/firebase/scripts/bootstrap-admin.mjs`).
- [x] Keep researcher identity traceable with `reporter_uid` on every accident.
- [x] Keep idempotent write key `request_id` equal to Firestore document ID.
- [ ] Enable Firebase App Check enforcement in Console after providers are configured.
- [x] Client App Check debug path: `apps/mobile/src/services/appCheck.ts` + `EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN`.

## Anti-Abuse Controls

- [ ] Enable Firebase App Check for Firestore/Auth in the Firebase console (Play Integrity / DeviceCheck for release).
- [ ] Add Cloud Armor or API Gateway limits if any public HTTP ingestion endpoints are exposed.
- [ ] Add moderation workflow for suspicious reports (manual review queue).
- [x] Spike alerts via hotspot pipeline → `admin_alerts`.

## Notifications

- [x] Local risk alerts (`expo-notifications`).
- [x] Persist `expo_push_token` on `users/{uid}` after permission grant.
- [x] Pipeline `notify-push.mjs` sends Expo push after hotspot refresh (Hotspot Pipeline Action).

## ML Safety

- [x] ML / risk publish is advisory only (`advisory_only: true`).
- [x] Do not auto-apply enforcement decisions from baseline output.
- [ ] Add evaluation thresholds and rollback before treating model scores as authoritative.
- [ ] Track false positive / false negative rates with regular evaluation.

## Quality Gates

- Mobile typecheck: `apps/mobile` → `npm run typecheck`
- Mobile tests: `apps/mobile` → `npm test`
- Firestore rules tests: `backend/firebase` → `npm run test:rules`
- GitHub Actions: `Quality Gates` on `main` / PRs
- Hotspot Pipeline: every 6h + `workflow_dispatch` (hotspots → risk publish → push)

## Operations

### Monitoring

- Configure crash reporting (e.g. Sentry) for the Expo app.
- Enable GitHub Actions failure email/Slack for `Hotspot Pipeline` and `Quality Gates`.
- Watch Firebase Authentication / Firestore usage charts for permission-denied spikes.

### Backups

1. Google Cloud Console → Firestore → Import/Export.
2. Create a Cloud Storage bucket (e.g. `safedrive-ng-firestore-backups`).
3. Schedule a daily export (Cloud Scheduler + `gcloud firestore export`).
4. Quarterly restore drill into a staging project.

### Incident response

- Owner: research lead / on-call engineer (assign before production participants enroll).
- Contacts: document email/phone in your private ops runbook (not in git).

### Admin API

- If Cloud Run admin role endpoint is deployed, set `EXPO_PUBLIC_ADMIN_ROLE_ENDPOINT` and restrict invokers to authenticated admin tooling only.
