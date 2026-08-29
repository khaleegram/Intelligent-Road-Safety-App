#!/usr/bin/env node
/**
 * Enrich SEM export: accidents joined with selected accident_features columns.
 * No PII (no email / phone / reporter identity beyond opaque reporter_uid hash optional skip).
 *
 * Usage:
 *   node export-sem-csv.mjs
 *   node export-sem-csv.mjs --limit 5000
 */
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'output');
const outFile = path.join(
  outDir,
  `sem-export-${new Date().toISOString().slice(0, 10)}.csv`
);

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined;

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

const FEATURE_KEYS = [
  'lighting_condition',
  'road_surface',
  'traffic_density',
  'suspected_cause',
  'vehicle_type',
  'driver_age_band',
  'speed_related',
  'alcohol_related',
  'seatbelt_used',
  'time_of_day',
  'day_of_week',
  'urban_rural',
  'junction_type',
];

const CORE_HEADERS = [
  'request_id',
  'latitude',
  'longitude',
  'timestamp',
  'severity',
  'road_type',
  'weather',
  'vehicle_count',
  'casualty_count',
  'verified',
];

const headers = [...CORE_HEADERS, ...FEATURE_KEYS];

const escape = (value) => {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

await mkdir(outDir, { recursive: true });
const stream = createWriteStream(outFile, { encoding: 'utf8' });
stream.write(`${headers.join(',')}\n`);

let query = db.collection('accidents').orderBy('created_at', 'desc');
if (Number.isFinite(limit) && limit > 0) {
  query = query.limit(limit);
}

const snapshot = await query.get();
let written = 0;

for (const docSnap of snapshot.docs) {
  const row = docSnap.data();
  const id = row.request_id ?? docSnap.id;
  let features = {};
  try {
    const featureDoc = await db.collection('accident_features').doc(id).get();
    if (featureDoc.exists) {
      features = featureDoc.data() ?? {};
    }
  } catch {
    features = {};
  }

  const values = [
    id,
    row.latitude,
    row.longitude,
    row.timestamp,
    row.severity,
    row.road_type,
    row.weather,
    row.vehicle_count,
    row.casualty_count,
    row.verified ?? false,
    ...FEATURE_KEYS.map((key) => features[key] ?? ''),
  ].map(escape);

  stream.write(`${values.join(',')}\n`);
  written += 1;
}

await new Promise((resolve, reject) => {
  stream.end(() => resolve());
  stream.on('error', reject);
});

console.log(`Wrote ${written} rows to ${outFile}`);
console.log(`Columns: ${headers.join(', ')}`);
