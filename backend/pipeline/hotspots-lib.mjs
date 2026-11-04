import fs from 'node:fs';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { computeHotspots } from '../shared/hotspots-core.mjs';

export { computeHotspots };

export const initFirestore = () => {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const envProjectId = process.env.FIREBASE_PROJECT_ID;
  const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (serviceAccountPath) {
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS path not found.');
    }
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else if (envProjectId && envClientEmail && envPrivateKey) {
    initializeApp({
      credential: cert({
        projectId: envProjectId,
        clientEmail: envClientEmail,
        privateKey: envPrivateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Application Default Credentials (Cloud Run / GCP)
    initializeApp();
  }

  return getFirestore();
};

export const runHotspotPipeline = async ({
  threshold,
  gridSizeDegrees,
  timeBucket,
  onlyVerified,
  dryRun,
}) => {
  const db = initFirestore();

  let query = db.collection('accidents');
  if (onlyVerified) {
    query = query.where('verified', '==', true);
  }
  const snapshot = await query.get();
  const accidents = [];
  snapshot.forEach((doc) => {
    accidents.push({ id: doc.id, ...doc.data() });
  });

  const hotspots = computeHotspots({
    accidents,
    threshold,
    gridSizeDegrees,
    timeBucket,
  });

  if (dryRun) {
    return { accidents: accidents.length, hotspots: hotspots.length, written: 0, alertsWritten: 0 };
  }

  const batchSize = 450;
  let written = 0;
  for (let i = 0; i < hotspots.length; i += batchSize) {
    const batch = db.batch();
    const slice = hotspots.slice(i, i + batchSize);
    for (const hotspot of slice) {
      const ref = db.collection('hotspots').doc(hotspot.area_id);
      batch.set(ref, hotspot, { merge: true });
      written += 1;
    }
    await batch.commit();
  }

  let alertsWritten = 0;
  const last24hCount = accidents.filter((item) => {
    const timestamp = item.created_at || item.timestamp;
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) return false;
    return parsed >= Date.now() - 24 * 60 * 60 * 1000;
  }).length;
  const spikeThreshold = Number(process.env.ALERT_SPIKE_THRESHOLD ?? 5);
  if (last24hCount >= spikeThreshold) {
    const alertId = `spike_${new Date().toISOString().slice(0, 13)}`;
    await db.collection('admin_alerts').doc(alertId).set(
      {
        type: 'spike',
        level: 'warning',
        message: `${last24hCount} reports in the last 24 hours`,
        count_24h: last24hCount,
        threshold: spikeThreshold,
        created_at: new Date().toISOString(),
      },
      { merge: true }
    );
    alertsWritten += 1;
  }

  return { accidents: accidents.length, hotspots: hotspots.length, written, alertsWritten };
};
