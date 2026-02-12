# Production Readiness Checklist

This checklist tracks the minimum controls required before production release.

## Security and Confidentiality

- Require authentication for app access and report submission.
- Restrict Firestore reads for `accidents` and `hotspots` to signed-in users only.
- Use server-trusted admin role (`users/{uid}.is_admin`) only.
- Keep researcher identity traceable with `reporter_uid` on every accident.
- Keep idempotent write key `request_id` equal to Firestore document ID.

## Anti-Abuse Controls

- Enable Firebase App Check for Firestore/Auth in the Firebase console.
- Add Cloud Armor or API Gateway limits if any public HTTP ingestion endpoints are exposed.
- Add moderation workflow for suspicious reports (manual review queue).
- Add alert threshold for abnormal submission spikes.

## ML Safety

- Current ML baseline in `backend/ml` is advisory only.
- Do not auto-apply enforcement decisions from baseline output.
- Add model versioning metadata, rollback strategy, and validation thresholds before production automation.
- Track false positive and false negative rates with regular evaluation.

## Quality Gates

- Mobile typecheck must pass (`apps/mobile`: `npm run typecheck`).
- Mobile service tests must pass (`apps/mobile`: `npm test`).
- Firestore rules tests must pass (`backend/firebase`: `npm run test:rules`).
- GitHub Actions workflow `Quality Gates` must pass on `main` and pull requests.

## Operations

- Configure error monitoring for mobile and backend services.
- Set alerts for:
  - failed hotspot pipeline runs
  - Firestore permission-denied spikes
  - crash-rate spikes
- Configure Firestore export backups (daily) and restoration drill cadence.
- Define incident response owner and on-call contact for production alerts.
