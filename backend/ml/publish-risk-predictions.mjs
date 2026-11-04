#!/usr/bin/env node
/**
 * Publish advisory risk_predictions from hotspot cells using the linked accident records.
 *
 * Scores are derived from the actual accidents inside each hotspot cell:
 *   severity weight + casualty weight + 30-day recency weight, normalised 0-100.
 * This is a transparent baseline model, not a trained classifier. advisory_only is always true.
 *
 * Usage (GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_* required):
 *   node publish-risk-predictions.mjs
 */
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const MODEL_VERSION = process.env.ML_MODEL_VERSION ?? 'severity-weighted-v2';
const GRID = Number(process.env.HOTSPOT_GRID ?? 0.03);

const SEVERITY_WEIGHT = {
  Fatal: 10,
  Critical: 6,
  Minor: 3,
  'Damage Only': 1,
};

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
  initializeApp({
    credential: applicationDefault(),
  });
}

function cellIdFor(lat, lng) {
  return `${Math.floor(lat / GRID)}:${Math.floor(lng / GRID)}`;
}

initAdmin();
const db = getFirestore();
const now = new Date().toISOString();
const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

const [accidentSnap, hotspotSnap] = await Promise.all([
  db.collection('accidents').get(),
  db.collection('hotspots').get(),
]);

const cells = new Map();
let dataThroughMs = 0;

for (const doc of accidentSnap.docs) {
  const data = doc.data();
  const lat = Number(data.latitude);
  const lng = Number(data.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

  const cellId = cellIdFor(lat, lng);
  const timestamp = Date.parse(data.created_at ?? data.timestamp);
  if (!Number.isNaN(timestamp) && timestamp > dataThroughMs) {
    dataThroughMs = timestamp;
  }

  const cell = cells.get(cellId) ?? {
    raw: 0,
    linked: 0,
    casualties: 0,
    recent30d: 0,
  };
  cell.raw += SEVERITY_WEIGHT[data.severity] ?? 1;
  cell.raw += Math.max(0, Number(data.casualty_count ?? 0)) * 2;
  cell.linked += 1;
  cell.casualties += Math.max(0, Number(data.casualty_count ?? 0));
  if (!Number.isNaN(timestamp) && timestamp >= thirtyDaysAgo) {
    cell.recent30d += 1;
    cell.raw += 3;
  }
  cells.set(cellId, cell);
}

const maxRaw = Math.max(1, ...[...cells.values()].map((cell) => cell.raw));
const dataThrough = dataThroughMs > 0 ? new Date(dataThroughMs).toISOString() : now;

let written = 0;
const batchSize = 450;
const hotspots = hotspotSnap.docs;

for (let i = 0; i < hotspots.length; i += batchSize) {
  const batch = db.batch();
  for (const doc of hotspots.slice(i, i + batchSize)) {
    const data = doc.data();
    const cellId = data.area_id ?? doc.id;
    const cell = cells.get(cellId);
    if (!cell) continue;

    const riskScore = Math.round((cell.raw / maxRaw) * 100);
    batch.set(
      db.collection('risk_predictions').doc(cellId),
      {
        center_lat: data.center_lat,
        center_lng: data.center_lng,
        risk_score: riskScore,
        linked_accidents: cell.linked,
        casualty_total: cell.casualties,
        recent_30d_count: cell.recent30d,
        model_version: MODEL_VERSION,
        data_through: dataThrough,
        updated_at: now,
        advisory_only: true,
      },
      { merge: true }
    );
    written += 1;
  }
  await batch.commit();
}

console.log(
  `Published ${written} advisory risk_predictions (${MODEL_VERSION}, ${accidentSnap.size} accidents scanned).`
);
