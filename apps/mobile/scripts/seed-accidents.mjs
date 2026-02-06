import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, getApps } from "firebase/app";
import { collection, doc, getFirestore, writeBatch } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually (since you're doing it already)
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const requiredKeys = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
];

const missing = requiredKeys.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing Firebase env vars in .env: ${missing.join(", ")}`);
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const nowIso = () => new Date().toISOString();
const pick = (items) => items[Math.floor(Math.random() * items.length)];
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ------------------------
// Hotspot settings
// ------------------------

// Your algo: grid 0.01°, threshold 3
const GRID_SIZE = 0.01;
const THRESHOLD = 3;

// Abuja-ish bounding box (city + nearby suburbs).
const BBOX = {
  minLat: 8.85,
  maxLat: 9.25,
  minLon: 7.20,
  maxLon: 7.70,
};

// “within ±0.001° so points stay in one cell”
const CLUSTER_JITTER = 0.001;

// How many hotspot cells to create
const HOTSPOT_CELLS = 100;

// Points per hotspot (must meet threshold)
const MIN_POINTS_PER_CELL = THRESHOLD; // 3
const MAX_POINTS_PER_CELL = 8;

// Random variety fields
const roadTypes = ["Urban", "Highway", "Residential", "Rural", "Intersection"];
const weatherTypes = ["Clear", "Rain", "Fog", "Night", "Harmattan"];
const severities = ["Fatal", "Critical", "Minor", "Damage Only"];

// Pick a random point, then snap it to the *center* of its grid cell
const randomCellCenter = () => {
  const lat = rand(BBOX.minLat, BBOX.maxLat);
  const lon = rand(BBOX.minLon, BBOX.maxLon);

  const gx = Math.floor(lon / GRID_SIZE);
  const gy = Math.floor(lat / GRID_SIZE);

  const centerLon = gx * GRID_SIZE + GRID_SIZE / 2;
  const centerLat = gy * GRID_SIZE + GRID_SIZE / 2;

  return { centerLat, centerLon, key: `${gx}:${gy}` };
};

// Make N accidents inside the same cell (jitter stays inside)
const buildClusterAccidents = (centerLat, centerLon, n) => {
  const list = [];
  for (let i = 0; i < n; i++) {
    const accident = {
      latitude: centerLat + rand(-CLUSTER_JITTER, CLUSTER_JITTER),
      longitude: centerLon + rand(-CLUSTER_JITTER, CLUSTER_JITTER),
      timestamp: nowIso(),
      severity: pick(severities),
      road_type: pick(roadTypes),
      weather: pick(weatherTypes),
      vehicle_count: randInt(1, 4),
      casualty_count: randInt(0, 3),
      created_at: nowIso(),
    };
    list.push(accident);
  }
  return list;
};

const seedAccidents = async () => {
  const accidentsRef = collection(db, "accidents");

  // 1) Select 100 unique grid cells across Abuja bbox
  const selected = new Map(); // key -> {centerLat, centerLon}
  let guard = 0;

  while (selected.size < HOTSPOT_CELLS && guard < 200000) {
    guard++;
    const c = randomCellCenter();

    // Keep unique cells only
    if (!selected.has(c.key)) {
      selected.set(c.key, { centerLat: c.centerLat, centerLon: c.centerLon });
    }
  }

  if (selected.size < HOTSPOT_CELLS) {
    console.error(
      `Could only select ${selected.size} unique cells. Expand bbox or reduce HOTSPOT_CELLS.`
    );
    process.exit(1);
  }

  // 2) Generate accidents for each hotspot cell
  const allAccidents = [];
  for (const { centerLat, centerLon } of selected.values()) {
    const n = randInt(MIN_POINTS_PER_CELL, MAX_POINTS_PER_CELL);
    allAccidents.push(...buildClusterAccidents(centerLat, centerLon, n));
  }

  // 3) Batched write (Firestore limit: 500 ops per batch)
  let created = 0;
  let batch = writeBatch(db);
  let ops = 0;

  for (const accident of allAccidents) {
    const ref = doc(accidentsRef); // auto-id
    batch.set(ref, accident);
    created++;
    ops++;

    if (ops >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();

  console.log(
    `Seed complete. Created ${created} accident records across ${HOTSPOT_CELLS} hotspot cells.`
  );
  process.exit(0);
};

seedAccidents().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
