# Firebase Backend

This folder stores Firestore rules and index definitions for the Intelligent Road Safety app.

## Files
- firestore.rules: Firestore security rules
- firestore.indexes.json: Firestore indexes

## Notes
- Deploy with Firebase CLI from repo root when ready.
- Keep secrets out of this repo; use environment variables instead.

## Local Rules Tests
- Install Java 21+ (required for current Firestore emulator tooling).
- From `backend/firebase`:
  - `npm install --legacy-peer-deps`
  - `npm run test:rules`

The test suite validates:
- authenticated-only reads for confidential data
- idempotent accident creation (`request_id == documentId`)
- admin-only verification updates
