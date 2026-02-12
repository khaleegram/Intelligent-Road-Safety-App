import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import admin from 'firebase-admin';

const args = new Set(process.argv.slice(2));
const onlyVerified = args.has('--verified');
const outDir = getArgValue('--out', 'exports');
const format = getArgValue('--format', 'csv');
const timeBucket = getArgValue('--time-bucket', 'all');

function getArgValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

const initFirestore = () => {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const envProjectId = process.env.FIREBASE_PROJECT_ID;
  const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else if (envProjectId && envClientEmail && envPrivateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: envProjectId,
        clientEmail: envClientEmail,
        privateKey: envPrivateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    admin.initializeApp();
  }

  return admin.firestore();
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

const buildDedupeKey = (accident) => {
  const lat = Number(accident.latitude);
  const lng = Number(accident.longitude);
  const timestamp = accident.timestamp || accident.created_at || '';
  const time = new Date(timestamp).getTime();
  const timeBucket = Number.isFinite(time) ? Math.floor(time / (5 * 60 * 1000)) : 'na';
  const latBucket = Number.isFinite(lat) ? lat.toFixed(3) : 'na';
  const lngBucket = Number.isFinite(lng) ? lng.toFixed(3) : 'na';
  return `${timeBucket}:${latBucket}:${lngBucket}`;
};

const exportAccidents = async () => {
  const db = initFirestore();
  let query = db.collection('accidents');
  if (onlyVerified) {
    query = query.where('verified', '==', true);
  }

  const snapshot = await query.get();
  const raw = [];
  snapshot.forEach((doc) => raw.push({ id: doc.id, ...doc.data() }));

  const deduped = new Map();
  for (const accident of raw) {
    const timestamp = accident.timestamp || accident.created_at || '';
    if (!applyTimeBucket(timestamp, timeBucket)) continue;
    const key = buildDedupeKey(accident);
    if (!deduped.has(key)) {
      deduped.set(key, accident);
    }
  }

  const rows = Array.from(deduped.values());
  const exportPath = path.resolve(outDir);
  fs.mkdirSync(exportPath, { recursive: true });
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `accidents_${dateTag}.${format}`;
  const filePath = path.join(exportPath, fileName);

  if (format === 'json') {
    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
  } else {
    const headers = [
      'id',
      'timestamp',
      'latitude',
      'longitude',
      'severity',
      'road_type',
      'weather',
      'vehicle_count',
      'casualty_count',
      'created_at',
      'source',
      'verified',
    ];
    const lines = [headers.join(',')];
    for (const row of rows) {
      const values = headers.map((key) => {
        const value = row[key] ?? '';
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      lines.push(values.join(','));
    }
    fs.writeFileSync(filePath, lines.join('\n'));
  }

  console.log(`Raw accidents: ${raw.length}`);
  console.log(`Deduped: ${rows.length}`);
  console.log(`Exported to ${filePath}`);
};

exportAccidents().catch((error) => {
  console.error('Export failed', error);
  process.exit(1);
});
