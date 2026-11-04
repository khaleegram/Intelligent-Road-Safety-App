import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import XLSX from 'xlsx';
import { computeHotspots } from '../shared/hotspots-core.mjs';
import { normalizeDatasetRow } from './import-dataset-lib.mjs';

const getArgValue = (flag, fallback) => {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
};

const hasFlag = (flag) => process.argv.includes(flag);

const args = {
  input: getArgValue('--input', ''),
  sheet: getArgValue('--sheet', ''),
  source: getArgValue('--source', 'road_safety_research_dataset_v1'),
  reporterUid: getArgValue('--reporter-uid', 'dataset_import_v1'),
  verifiedBy: getArgValue('--verified-by', 'dataset_import_v1'),
  batchSize: Number(getArgValue('--batch-size', '350')),
  hotspotThreshold: Number(getArgValue('--threshold', '3')),
  hotspotGrid: Number(getArgValue('--grid', '0.01')),
  hotspotTimeBucket: getArgValue('--time-bucket', 'all'),
  hotspotOnlyVerified: hasFlag('--hotspots-verified'),
  dryRun: hasFlag('--dry-run'),
  skipHotspots: hasFlag('--skip-hotspots'),
};

const parseJsonEnvIfNeeded = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const initFirestore = () => {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const servicePath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ?? process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const envProjectId = process.env.FIREBASE_PROJECT_ID;
  const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (servicePath) {
    const absolutePath = path.resolve(process.cwd(), servicePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Service account file not found: ${absolutePath}`);
    }
    const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = parseJsonEnvIfNeeded(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (!parsed) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is set but not valid JSON.');
    }
    initializeApp({
      credential: cert(parsed),
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
    initializeApp();
  }

  return getFirestore();
};

const createRunId = () => {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `import_${stamp}`;
};

const incrementCounter = (map, key) => {
  map[key] = (map[key] ?? 0) + 1;
};

const readRowsFromWorkbook = (inputPath, sheetOverride) => {
  const workbook = XLSX.readFile(inputPath, { cellDates: false });
  const sheetName = sheetOverride || workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Workbook has no sheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: true,
    blankrows: false,
  });

  return { sheetName, rows };
};

const commitBatchIfNeeded = async (state, force = false) => {
  if (!force && state.ops < state.limit) return;
  if (state.ops === 0) return;
  await state.batch.commit();
  state.batch = state.db.batch();
  state.ops = 0;
};

const writeRecords = async (db, records, batchLimit) => {
  const state = {
    db,
    batch: db.batch(),
    ops: 0,
    limit: Math.min(450, Math.max(50, batchLimit)),
  };

  let accidentsWritten = 0;
  let featuresWritten = 0;

  for (const item of records) {
    const accidentRef = db.collection('accidents').doc(item.requestId);
    const featureRef = db.collection('accident_features').doc(item.requestId);
    state.batch.set(accidentRef, item.accident, { merge: true });
    state.ops += 1;
    accidentsWritten += 1;
    await commitBatchIfNeeded(state);

    state.batch.set(featureRef, item.features, { merge: true });
    state.ops += 1;
    featuresWritten += 1;
    await commitBatchIfNeeded(state);
  }

  await commitBatchIfNeeded(state, true);
  return { accidentsWritten, featuresWritten };
};

const writeHotspots = async (db, hotspots, batchLimit) => {
  const state = {
    db,
    batch: db.batch(),
    ops: 0,
    limit: Math.min(450, Math.max(50, batchLimit)),
  };

  let written = 0;
  for (const hotspot of hotspots) {
    const ref = db.collection('hotspots').doc(hotspot.area_id);
    state.batch.set(ref, hotspot, { merge: true });
    state.ops += 1;
    written += 1;
    await commitBatchIfNeeded(state);
  }
  await commitBatchIfNeeded(state, true);
  return written;
};

const deleteStaleHotspots = async (db, staleIds, batchLimit) => {
  if (staleIds.length === 0) return 0;
  const state = {
    db,
    batch: db.batch(),
    ops: 0,
    limit: Math.min(450, Math.max(50, batchLimit)),
  };

  let deleted = 0;
  for (const id of staleIds) {
    const ref = db.collection('hotspots').doc(id);
    state.batch.delete(ref);
    state.ops += 1;
    deleted += 1;
    await commitBatchIfNeeded(state);
  }
  await commitBatchIfNeeded(state, true);
  return deleted;
};

const writeSpikeAlertIfNeeded = async (db, accidents) => {
  const spikeThreshold = Number(process.env.ALERT_SPIKE_THRESHOLD ?? 5);
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  const last24hCount = accidents.filter((item) => {
    const parsed = Date.parse(item.created_at || item.timestamp || '');
    if (Number.isNaN(parsed)) return false;
    return parsed >= twentyFourHoursAgo;
  }).length;

  if (last24hCount < spikeThreshold) {
    return { alertsWritten: 0, last24hCount, threshold: spikeThreshold };
  }

  const alertId = `spike_${new Date().toISOString().slice(0, 13)}`;
  await db.collection('admin_alerts').doc(alertId).set({
    type: 'spike',
    level: 'warning',
    message: `${last24hCount} reports in the last 24 hours`,
    count_24h: last24hCount,
    threshold: spikeThreshold,
    created_at: new Date().toISOString(),
  }, { merge: true });

  return { alertsWritten: 1, last24hCount, threshold: spikeThreshold };
};

const refreshHotspots = async (db, options) => {
  let query = db.collection('accidents');
  if (options.onlyVerified) {
    query = query.where('verified', '==', true);
  }

  const accidentSnap = await query.get();
  const accidents = [];
  accidentSnap.forEach((doc) => {
    accidents.push({ id: doc.id, ...doc.data() });
  });

  const hotspots = computeHotspots({
    accidents,
    threshold: options.threshold,
    gridSizeDegrees: options.gridSizeDegrees,
    timeBucket: options.timeBucket,
  });

  const existingHotspots = await db.collection('hotspots').get();
  const existingIds = new Set();
  existingHotspots.forEach((doc) => existingIds.add(doc.id));

  const nextIds = new Set(hotspots.map((item) => item.area_id));
  const staleIds = Array.from(existingIds).filter((id) => !nextIds.has(id));

  const written = await writeHotspots(db, hotspots, options.batchSize);
  const deleted = await deleteStaleHotspots(db, staleIds, options.batchSize);
  const alertResult = await writeSpikeAlertIfNeeded(db, accidents);

  return {
    accidents: accidents.length,
    hotspots: hotspots.length,
    hotspotsWritten: written,
    hotspotsDeleted: deleted,
    alertsWritten: alertResult.alertsWritten,
    last24hCount: alertResult.last24hCount,
    spikeThreshold: alertResult.threshold,
  };
};

const printSummary = (summary) => {
  console.log(JSON.stringify(summary, null, 2));
};

const main = async () => {
  if (!args.input) {
    throw new Error('Missing required --input path to .xlsx file.');
  }
  if (Number.isNaN(args.batchSize) || args.batchSize < 50 || args.batchSize > 450) {
    throw new Error('--batch-size must be between 50 and 450.');
  }
  if (Number.isNaN(args.hotspotThreshold) || args.hotspotThreshold < 1) {
    throw new Error('--threshold must be a number >= 1.');
  }
  if (Number.isNaN(args.hotspotGrid) || args.hotspotGrid <= 0) {
    throw new Error('--grid must be a positive number.');
  }

  const inputPath = path.resolve(process.cwd(), args.input);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const startedAt = new Date().toISOString();
  const runId = createRunId();
  const { sheetName, rows } = readRowsFromWorkbook(inputPath, args.sheet);
  const reasonCounts = {};
  const rejectedSamples = [];
  const seenRequestIds = new Set();
  const validRecords = [];
  let duplicateIds = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const normalized = normalizeDatasetRow(row, {
      importedAt: startedAt,
      sourceDataset: args.source,
      importRunId: runId,
      reporterUid: args.reporterUid,
      verifiedBy: args.verifiedBy,
    });

    if (!normalized.ok) {
      incrementCounter(reasonCounts, normalized.reason);
      if (rejectedSamples.length < 10) {
        rejectedSamples.push({
          row: i + 2,
          reason: normalized.reason,
          incident_id: row.incident_id ?? null,
        });
      }
      continue;
    }

    if (seenRequestIds.has(normalized.requestId)) {
      duplicateIds += 1;
      incrementCounter(reasonCounts, 'duplicate_request_id');
      continue;
    }

    seenRequestIds.add(normalized.requestId);
    validRecords.push(normalized);
  }

  const summary = {
    run_id: runId,
    source_file: inputPath,
    source_label: args.source,
    sheet: sheetName,
    started_at: startedAt,
    completed_at: null,
    total_rows: rows.length,
    valid_rows: validRecords.length,
    skipped_rows: rows.length - validRecords.length,
    duplicate_ids_skipped: duplicateIds,
    dry_run: args.dryRun,
    hotspot_refresh_requested: !args.skipHotspots,
    hotspot_refresh_result: null,
    accidents_written: 0,
    features_written: 0,
    reason_counts: reasonCounts,
    rejected_samples: rejectedSamples,
  };

  if (!args.dryRun) {
    const db = initFirestore();
    const writeResult = await writeRecords(db, validRecords, args.batchSize);
    summary.accidents_written = writeResult.accidentsWritten;
    summary.features_written = writeResult.featuresWritten;

    if (!args.skipHotspots) {
      summary.hotspot_refresh_result = await refreshHotspots(db, {
        threshold: args.hotspotThreshold,
        gridSizeDegrees: args.hotspotGrid,
        timeBucket: args.hotspotTimeBucket,
        onlyVerified: args.hotspotOnlyVerified,
        batchSize: args.batchSize,
      });
    }

    summary.completed_at = new Date().toISOString();
    await db.collection('dataset_import_runs').doc(runId).set(summary, { merge: true });
  } else {
    if (!args.skipHotspots) {
      const previewHotspots = computeHotspots({
        accidents: validRecords.map((item) => item.accident),
        threshold: args.hotspotThreshold,
        gridSizeDegrees: args.hotspotGrid,
        timeBucket: args.hotspotTimeBucket,
      });
      summary.hotspot_refresh_result = {
        accidents: validRecords.length,
        hotspots: previewHotspots.length,
        dry_run_preview: true,
      };
    }
    summary.completed_at = new Date().toISOString();
  }

  printSummary(summary);
};

main().catch((error) => {
  console.error('Dataset import failed:', error);
  process.exit(1);
});
