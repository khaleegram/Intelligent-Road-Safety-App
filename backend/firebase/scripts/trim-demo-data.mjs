#!/usr/bin/env node
/**
 * Shrink the synthetic demo dataset so the map is readable.
 *
 * Keeps the newest N seeded accidents, deletes the rest (and their
 * accident_features), then clears derived hotspots/risk predictions.
 * Re-run the data loop afterwards to recompute hotspots from the reduced set.
 *
 * Usage (from backend/firebase):
 *   GOOGLE_APPLICATION_CREDENTIALS=../../secrets/irs-service-account.json \
 *     node scripts/trim-demo-data.mjs --keep 250
 *
 * Add --dry-run to only print counts.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SEED_REPORTER_UID = 'seed_bot_highway_north';
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
};
const keep = Math.max(0, Number(getArg('--keep', '250')));
const dryRun = args.includes('--dry-run');

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return;
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(scriptDir, '../../..');
  const localKey = path.join(repoRoot, 'secrets', 'irs-service-account.json');
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(localKey)) {
    initializeApp({ credential: cert(JSON.parse(fs.readFileSync(localKey, 'utf8'))) });
    return;
  }

  initializeApp({ credential: applicationDefault() });
}

async function clearCollection(db, name) {
  let removed = 0;
  while (true) {
    const snapshot = await db.collection(name).limit(400).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
    removed += snapshot.size;
  }
  return removed;
}

initAdmin();
const db = getFirestore();

const snapshot = await db
  .collection('accidents')
  .where('reporter_uid', '==', SEED_REPORTER_UID)
  .get();

const docs = snapshot.docs.sort((a, b) => {
  const aTime = Date.parse(a.data().created_at ?? a.data().timestamp ?? '') || 0;
  const bTime = Date.parse(b.data().created_at ?? b.data().timestamp ?? '') || 0;
  return bTime - aTime;
});

const toDelete = docs.slice(keep);
console.log(
  `seed accidents: ${docs.length} | keeping newest: ${Math.min(keep, docs.length)} | deleting: ${toDelete.length}`
);

if (dryRun) {
  console.log('Dry run: no writes performed.');
  process.exit(0);
}

for (let i = 0; i < toDelete.length; i += 200) {
  const batch = db.batch();
  for (const item of toDelete.slice(i, i + 200)) {
    batch.delete(item.ref);
    batch.delete(db.collection('accident_features').doc(item.id));
  }
  await batch.commit();
}

const removedHotspots = await clearCollection(db, 'hotspots');
const removedPredictions = await clearCollection(db, 'risk_predictions');
const removedAlerts = await clearCollection(db, 'admin_alerts');

console.log(
  `Deleted ${toDelete.length} seed accidents, ${removedHotspots} hotspots, ${removedPredictions} risk predictions, ${removedAlerts} admin alerts.`
);
console.log('Next: recompute from the reduced dataset with the data loop.');
