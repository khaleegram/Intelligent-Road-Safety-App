import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import admin from 'firebase-admin';

const severityWeight = {
  Fatal: 5,
  Critical: 3,
  Minor: 2,
  'Damage Only': 1,
};

const applyTimeBucket = (timestamp, bucket) => {
  if (bucket === 'all') return true;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;
  if (bucket === 'last_30d') {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return date.getTime() >= cutoff;
  }
  if (bucket === 'last_90d') {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return date.getTime() >= cutoff;
  }
  return true;
};

const getCellKey = (lat, lng, gridSize) => {
  const latIndex = Math.floor(lat / gridSize);
  const lngIndex = Math.floor(lng / gridSize);
  return `${latIndex}:${lngIndex}`;
};

export const initFirestore = () => {
  if (admin.apps.length > 0) {
    return admin.firestore();
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
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (envProjectId && envClientEmail && envPrivateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: envProjectId,
        clientEmail: envClientEmail,
        privateKey: envPrivateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Application Default Credentials (Cloud Run / GCP)
    admin.initializeApp();
  }

  return admin.firestore();
};

export const computeHotspots = ({ accidents, threshold, gridSizeDegrees, timeBucket }) => {
  const cells = new Map();

  for (const accident of accidents) {
    const lat = Number(accident.latitude);
    const lng = Number(accident.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const timestamp = accident.created_at || accident.timestamp || new Date().toISOString();
    if (!applyTimeBucket(timestamp, timeBucket)) continue;

    const key = getCellKey(lat, lng, gridSizeDegrees);
    const weight = severityWeight[accident.severity] ?? 1;
    const severity = accident.severity ?? 'Minor';

    const existing = cells.get(key);
    if (existing) {
      existing.count += 1;
      existing.riskScore += weight;
      existing.sumLat += lat;
      existing.sumLng += lng;
      existing.maxSeverity = weight >= existing.maxSeverityWeight ? severity : existing.maxSeverity;
      existing.maxSeverityWeight = Math.max(existing.maxSeverityWeight, weight);
      existing.latestTimestamp = existing.latestTimestamp > timestamp ? existing.latestTimestamp : timestamp;
    } else {
      cells.set(key, {
        count: 1,
        riskScore: weight,
        sumLat: lat,
        sumLng: lng,
        maxSeverity: severity,
        maxSeverityWeight: weight,
        latestTimestamp: timestamp,
      });
    }
  }

  const hotspots = [];
  for (const [cellId, cell] of cells.entries()) {
    if (cell.count < threshold) continue;
    hotspots.push({
      area_id: cellId,
      center_lat: cell.sumLat / cell.count,
      center_lng: cell.sumLng / cell.count,
      risk_score: cell.riskScore,
      severity_level: cell.maxSeverity,
      accident_count: cell.count,
      last_updated: cell.latestTimestamp,
      model_version: 'baseline-v1',
      time_bucket: timeBucket,
    });
  }

  return hotspots;
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
    return { accidents: accidents.length, hotspots: hotspots.length, written: 0 };
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

  return { accidents: accidents.length, hotspots: hotspots.length, written };
};
