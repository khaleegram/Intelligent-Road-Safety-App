import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  const value = args[idx + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
};

const hasFlag = (name) => args.includes(`--${name}`);

const TARGET_COUNT = Number(getArg('count', '1400'));
const DRY_RUN = hasFlag('dry-run');

const nowIso = () => new Date().toISOString();
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (items) => items[Math.floor(Math.random() * items.length)];

const weightedPick = (items) => {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = rand(0, total);
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item.value;
  }
  return items[items.length - 1].value;
};

const parseJsonEnvIfNeeded = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const initAdmin = () => {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : null;

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const raw = fs.readFileSync(serviceAccountPath, 'utf8');
    initializeApp({ credential: cert(JSON.parse(raw)) });
    return;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = parseJsonEnvIfNeeded(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (parsed) {
      initializeApp({ credential: cert(parsed) });
      return;
    }
  }

  initializeApp({ credential: applicationDefault() });
};

// Routes emphasize Abuja to northern cities/highways.
const CORRIDORS = [
  {
    name: 'A1 Abuja-Kaduna-Zaria-Kano-Katsina',
    weight: 5,
    points: [
      { lat: 9.0765, lon: 7.3986 }, // Abuja
      { lat: 10.5222, lon: 7.4383 }, // Kaduna
      { lat: 11.0855, lon: 7.7199 }, // Zaria
      { lat: 12.0022, lon: 8.5920 }, // Kano
      { lat: 12.9908, lon: 7.6006 }, // Katsina
    ],
  },
  {
    name: 'A3 Abuja-Jos-Bauchi-Gombe',
    weight: 4,
    points: [
      { lat: 9.0765, lon: 7.3986 }, // Abuja
      { lat: 9.8965, lon: 8.8583 }, // Jos
      { lat: 10.3158, lon: 9.8442 }, // Bauchi
      { lat: 10.2904, lon: 11.1697 }, // Gombe
    ],
  },
  {
    name: 'Abuja-Minna-Kaduna connector',
    weight: 3,
    points: [
      { lat: 9.0765, lon: 7.3986 }, // Abuja
      { lat: 9.6152, lon: 6.5569 }, // Minna
      { lat: 10.5222, lon: 7.4383 }, // Kaduna
    ],
  },
  {
    name: 'Kano-Dutse-Katsina northern arc',
    weight: 2,
    points: [
      { lat: 12.0022, lon: 8.5920 }, // Kano
      { lat: 11.7562, lon: 9.3380 }, // Dutse
      { lat: 12.9908, lon: 7.6006 }, // Katsina
    ],
  },
];

const ROAD_TYPES = ['Highway', 'Highway', 'Highway', 'Rural', 'Intersection'];
const WEATHER_TYPES = [
  { value: 'Clear', weight: 6 },
  { value: 'Rain', weight: 4 },
  { value: 'Fog', weight: 2 },
  { value: 'Night', weight: 4 },
  { value: 'Harmattan', weight: 3 },
];
const SEVERITIES = [
  { value: 'Fatal', weight: 1 },
  { value: 'Critical', weight: 2 },
  { value: 'Minor', weight: 6 },
  { value: 'Damage Only', weight: 3 },
];

const SEGMENT_JITTER_DEG = 0.0032; // roughly ~300m at this latitude
const SEED_REPORTER_UID = process.env.SEED_REPORTER_UID ?? 'seed_bot_highway_north';

const randomDateIso = (daysBack = 540) => {
  const now = Date.now();
  const earliest = now - daysBack * 24 * 60 * 60 * 1000;
  const ts = rand(earliest, now);
  return new Date(ts).toISOString();
};

const interpolate = (a, b, t) => {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
  };
};

const pickCorridor = () => weightedPick(CORRIDORS.map((c) => ({ value: c, weight: c.weight })));

const buildHighwayAccident = (index) => {
  const corridor = pickCorridor();
  const segmentIndex = randInt(0, corridor.points.length - 2);
  const start = corridor.points[segmentIndex];
  const end = corridor.points[segmentIndex + 1];
  const t = rand(0.03, 0.97);
  const base = interpolate(start, end, t);

  const severity = weightedPick(SEVERITIES);
  const casualtyCount =
    severity === 'Fatal'
      ? randInt(1, 6)
      : severity === 'Critical'
        ? randInt(1, 4)
        : severity === 'Minor'
          ? randInt(0, 2)
          : randInt(0, 1);
  const vehicleCount = severity === 'Damage Only' ? randInt(1, 3) : randInt(1, 5);

  const createdAt = randomDateIso();
  const requestId = `seed_${Date.now()}_${String(index).padStart(4, '0')}_${randInt(1000, 9999)}`;

  return {
    request_id: requestId,
    latitude: base.lat + rand(-SEGMENT_JITTER_DEG, SEGMENT_JITTER_DEG),
    longitude: base.lon + rand(-SEGMENT_JITTER_DEG, SEGMENT_JITTER_DEG),
    timestamp: createdAt,
    severity,
    road_type: pick(ROAD_TYPES),
    weather: weightedPick(WEATHER_TYPES),
    vehicle_count: vehicleCount,
    casualty_count: casualtyCount,
    created_at: createdAt,
    reporter_uid: SEED_REPORTER_UID,
  };
};

const main = async () => {
  initAdmin();
  const db = getFirestore();
  const accidentsRef = db.collection('accidents');

  if (Number.isNaN(TARGET_COUNT) || TARGET_COUNT < 1000) {
    throw new Error('--count must be a number >= 1000');
  }

  const records = Array.from({ length: TARGET_COUNT }, (_, idx) => buildHighwayAccident(idx));

  if (DRY_RUN) {
    console.log(`[dry-run] Generated ${records.length} highway accidents.`);
    console.log(`[dry-run] Example doc id: ${records[0]?.request_id ?? 'none'}`);
    console.log(`[dry-run] Generated at: ${nowIso()}`);
    return;
  }

  let batch = db.batch();
  let ops = 0;
  let written = 0;

  for (const record of records) {
    const ref = accidentsRef.doc(record.request_id);
    batch.set(ref, record, { merge: true });
    ops += 1;
    written += 1;

    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  console.log(
    `Seed complete. Wrote ${written} highway-focused accidents for Abuja->Northern corridors at ${nowIso()}.`
  );
};

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
