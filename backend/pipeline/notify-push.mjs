#!/usr/bin/env node
/**
 * After hotspot refresh, optionally notify users who registered Expo push tokens.
 * Uses Expo Push API (https://exp.host/--/api/v2/push/send).
 *
 * Env:
 *   FIREBASE_* or GOOGLE_APPLICATION_CREDENTIALS
 *   SKIP_PUSH=1 to no-op
 */
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (process.env.SKIP_PUSH === '1') {
  console.log('SKIP_PUSH=1 — notify-push skipped');
  process.exit(0);
}

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return;
  }
  initializeApp({ credential: applicationDefault() });
}

initAdmin();
const db = getFirestore();

const usersSnap = await db.collection('users').get();
const tokens = [];
usersSnap.forEach((doc) => {
  const token = doc.data()?.expo_push_token;
  if (typeof token === 'string' && token.startsWith('ExponentPushToken')) {
    tokens.push(token);
  }
});

if (tokens.length === 0) {
  console.log('No expo_push_token values found — nothing to send');
  process.exit(0);
}

const hotspotCount = (await db.collection('hotspots').count().get()).data().count;
const body = {
  to: tokens,
  title: 'SafeDrive NG',
  body: `Hotspot map updated (${hotspotCount} risk zones). Open the app for details.`,
  data: { type: 'hotspot_refresh', count: hotspotCount },
  sound: 'default',
};

const chunks = [];
for (let i = 0; i < tokens.length; i += 100) {
  chunks.push(tokens.slice(i, i + 100));
}

let sent = 0;
for (const chunk of chunks) {
  const payload = chunk.map((to) => ({
    to,
    title: body.title,
    body: body.body,
    data: body.data,
    sound: 'default',
  }));
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Expo push failed', res.status, text);
    process.exit(1);
  }
  sent += chunk.length;
}

console.log(`Sent hotspot refresh push to ${sent} device(s)`);
