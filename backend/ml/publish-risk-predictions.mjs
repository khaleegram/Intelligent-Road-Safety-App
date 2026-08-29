#!/usr/bin/env node
/**
 * Batch-publish advisory risk_predictions from hotspot cells.
 * Does not auto-enforce decisions — advisory_only is always true.
 *
 * Usage (GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_* required):
 *   node publish-risk-predictions.mjs
 */
import admin from 'firebase-admin';

const MODEL_VERSION = process.env.ML_MODEL_VERSION ?? 'baseline-gb-v1';

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
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

initAdmin();
const db = admin.firestore();
const now = new Date().toISOString();

const hotspots = await db.collection('hotspots').get();
let written = 0;

for (const doc of hotspots.docs) {
  const data = doc.data();
  const cellId = data.area_id ?? doc.id;
  const riskScore = Number(data.risk_score ?? 0);
  await db.collection('risk_predictions').doc(cellId).set(
    {
      center_lat: data.center_lat,
      center_lng: data.center_lng,
      risk_score: riskScore,
      model_version: MODEL_VERSION,
      updated_at: now,
      advisory_only: true,
    },
    { merge: true }
  );
  written += 1;
}

console.log(`Published ${written} advisory risk_predictions (model ${MODEL_VERSION}).`);
