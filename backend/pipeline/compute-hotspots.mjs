import process from 'node:process';
import { runHotspotPipeline } from './hotspots-lib.mjs';

const args = new Set(process.argv.slice(2));
const threshold = Number(getArgValue('--threshold', '3'));
const gridSizeDegrees = Number(getArgValue('--grid', '0.01'));
const dryRun = args.has('--dry-run');
const onlyVerified = args.has('--verified');
const timeBucket = getArgValue('--time-bucket', 'all');

if (Number.isNaN(threshold) || Number.isNaN(gridSizeDegrees)) {
  console.error('Invalid --threshold or --grid value.');
  process.exit(1);
}

function getArgValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

runHotspotPipeline({
  threshold,
  gridSizeDegrees,
  timeBucket,
  onlyVerified,
  dryRun,
})
  .then((result) => {
    console.log(`Accidents: ${result.accidents}`);
    console.log(`Hotspots: ${result.hotspots}`);
    if (dryRun) {
      console.log('Dry run mode: no writes performed.');
    } else {
      console.log(`Hotspots written to Firestore: ${result.written}`);
    }
  })
  .catch((error) => {
    console.error('Hotspot pipeline failed', error);
    process.exit(1);
  });
