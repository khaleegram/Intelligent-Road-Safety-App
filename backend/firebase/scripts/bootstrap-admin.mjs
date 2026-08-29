#!/usr/bin/env node
/**
 * Grant is_admin on users/{uid} after first signup.
 *
 * Usage (GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_* env required):
 *   node scripts/bootstrap-admin.mjs --email you@example.com
 *   node scripts/bootstrap-admin.mjs --uid <uid>
 */
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
};

const email = getArg('--email')?.toLowerCase();
const uidArg = getArg('--uid');

if (!email && !uidArg) {
  console.error('Provide --email <addr> or --uid <uid>');
  process.exit(1);
}

function initAdmin() {
  if (admin.apps.length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    return;
  }
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

initAdmin();
const db = admin.firestore();
const auth = admin.auth();

let uid = uidArg;
if (!uid && email) {
  const user = await auth.getUserByEmail(email);
  uid = user.uid;
}

await db.collection('users').doc(uid).set(
  {
    is_admin: true,
    email: email ?? (await auth.getUser(uid)).email?.toLowerCase() ?? '',
    admin_granted_at: new Date().toISOString(),
  },
  { merge: true }
);

console.log(`Granted is_admin=true for users/${uid}`);
