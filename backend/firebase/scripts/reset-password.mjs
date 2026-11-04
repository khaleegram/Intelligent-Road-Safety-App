#!/usr/bin/env node
/**
 * Reset (or create) a Firebase Auth email/password account.
 *
 * Requires a valid service account (GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_*).
 *
 * Usage:
 *   node scripts/reset-password.mjs --email you@example.com
 *   node scripts/reset-password.mjs --email you@example.com --admin
 *
 * The new password is prompted for and never echoed to the terminal.
 */
import process from 'node:process';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
};

const email = getArg('--email')?.trim().toLowerCase();
const grantAdmin = args.includes('--admin');

if (!email) {
  console.error('Usage: node scripts/reset-password.mjs --email <addr> [--admin]');
  process.exit(1);
}

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return;
  }
  initializeApp({ credential: applicationDefault() });
}

function promptHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = Boolean(stdin.isRaw);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';
    const finish = () => {
      stdin.setRawMode?.(wasRaw);
      stdin.pause();
      stdin.removeListener('data', onData);
      process.stdout.write('\n');
      resolve(value);
    };

    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u0003') {
          process.stdout.write('\n');
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };

    stdin.on('data', onData);
  });
}

initAdmin();
const auth = getAuth();

const password = await promptHidden('New password: ');
if (password.length < 6) {
  console.error('Password must be at least 6 characters.');
  process.exit(1);
}
const confirm = await promptHidden('Confirm password: ');
if (password !== confirm) {
  console.error('Passwords do not match.');
  process.exit(1);
}

let user;
try {
  user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password });
  console.log(`Password updated for ${email} (uid ${user.uid}).`);
} catch (error) {
  if (error?.code !== 'auth/user-not-found') throw error;
  user = await auth.createUser({ email, password });
  console.log(`Created new account ${email} (uid ${user.uid}).`);
}

if (grantAdmin) {
  await getFirestore()
    .collection('users')
    .doc(user.uid)
    .set(
      {
        email,
        is_admin: true,
        admin_granted_at: new Date().toISOString(),
      },
      { merge: true }
    );
  console.log(`Granted is_admin=true for users/${user.uid}.`);
}
