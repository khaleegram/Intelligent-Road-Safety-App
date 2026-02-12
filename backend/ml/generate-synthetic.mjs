import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2] ?? 'exports';
const count = Number(process.argv[3] ?? 2000);

const severities = ['Fatal', 'Critical', 'Minor', 'Damage Only'];
const roadTypes = ['Urban', 'Highway', 'Residential', 'Rural', 'Intersection'];
const weatherTypes = ['Clear', 'Rain', 'Fog', 'Night', 'Harmattan'];

const clusters = [
  { name: 'Abuja', center: [7.4951, 9.0579], weight: 0.4 },
  { name: 'Lagos', center: [3.3792, 6.5244], weight: 0.4 },
  { name: 'Kano', center: [8.5223, 12.0022], weight: 0.2 },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickCluster = () => {
  const r = Math.random();
  let acc = 0;
  for (const c of clusters) {
    acc += c.weight;
    if (r <= acc) return c;
  }
  return clusters[clusters.length - 1];
};

const jitter = (value, scale = 0.01) => value + (Math.random() - 0.5) * scale;

const now = Date.now();
const start = now - 180 * 24 * 60 * 60 * 1000; // last 180 days

const rows = [];
for (let i = 0; i < count; i += 1) {
  const cluster = pickCluster();
  const timestamp = new Date(start + Math.random() * (now - start)).toISOString();
  const severity = pick(severities);
  const row = {
    id: `synthetic_${i + 1}`,
    timestamp,
    latitude: jitter(cluster.center[1], 0.02).toFixed(6),
    longitude: jitter(cluster.center[0], 0.02).toFixed(6),
    severity,
    road_type: pick(roadTypes),
    weather: pick(weatherTypes),
    vehicle_count: Math.floor(Math.random() * 4) + 1,
    casualty_count: Math.floor(Math.random() * 3),
    created_at: timestamp,
    source: 'synthetic',
    verified: 'false',
  };
  rows.push(row);
}

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

const exportPath = path.resolve(outDir);
fs.mkdirSync(exportPath, { recursive: true });
const filePath = path.join(exportPath, `synthetic_accidents_${count}.csv`);
fs.writeFileSync(filePath, lines.join('\n'));
console.log(`Synthetic dataset written to ${filePath}`);
