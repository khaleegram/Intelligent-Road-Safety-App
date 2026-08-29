# Firebase Backend (SafeDrive NG)

Firestore rules, indexes, and Admin SDK helpers for SafeDrive NG.

## Files

- `firestore.rules` — security rules
- `firestore.indexes.json` — composite indexes
- `.firebaserc` — default Firebase project id (replace `YOUR_FIREBASE_PROJECT_ID`)
- `scripts/bootstrap-admin.mjs` — grant first admin (`is_admin: true`)

## One-time console setup

1. Create a Firebase project (or select an existing one).
2. Enable **Firestore**.
3. Enable **Authentication → Sign-in method → Email/Password**.
4. Register a web app and copy config into `apps/mobile/.env`.
5. Create a service account (Project settings → Service accounts → Generate new private key) and set:
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\Secure\firebase\serviceAccount.json"
   ```

## Deploy rules and indexes

Replace the project id in `.firebaserc`, then:

```powershell
cd backend/firebase
npm install --legacy-peer-deps
npx firebase login
# Edit .firebaserc → projects.default = your project id
npx firebase deploy --only firestore:rules,firestore:indexes
```

Or pass project explicitly:

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_FIREBASE_PROJECT_ID
```

## Bootstrap first admin

After the first user signs up in the app:

```powershell
cd backend/firebase
node scripts/bootstrap-admin.mjs --email researcher@example.com
# or: node scripts/bootstrap-admin.mjs --uid <firebaseAuthUid>
```

## Local rules tests

- Install Java 21+ (Firestore emulator).
- From `backend/firebase`:
  - `npm install --legacy-peer-deps`
  - `npm run test:rules`

The test suite validates authenticated-only reads, idempotent accident creation, and admin-only verification updates.
