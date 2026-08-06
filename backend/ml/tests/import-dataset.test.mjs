import assert from 'node:assert/strict';
import {
  normalizeHeaderKey,
  normalizeSeverity,
  parseDatasetTimestamp,
  normalizeDatasetRow,
} from '../import-dataset-lib.mjs';

const run = (name, fn) => {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

run('normalizeHeaderKey converts mixed naming to snake_case', () => {
  assert.equal(normalizeHeaderKey('Daily_Traffic_Volume'), 'daily_traffic_volume');
  assert.equal(normalizeHeaderKey('Road Safety Campaign Intensity'), 'road_safety_campaign_intensity');
  assert.equal(normalizeHeaderKey('LGA'), 'lga');
});

run('normalizeSeverity maps dataset values to app severities', () => {
  assert.equal(normalizeSeverity('Fatal'), 'Fatal');
  assert.equal(normalizeSeverity('critical'), 'Critical');
  assert.equal(normalizeSeverity('Minor'), 'Minor');
  assert.equal(normalizeSeverity('Damage'), 'Damage Only');
  assert.equal(normalizeSeverity('Damage Only'), 'Damage Only');
  assert.equal(normalizeSeverity('unknown'), null);
});

run('parseDatasetTimestamp supports Excel serial timestamps', () => {
  const timestamp = parseDatasetTimestamp({
    timestamp: 45541.36041666667,
    date: null,
    time: null,
  });
  assert.ok(timestamp);
  assert.ok(!Number.isNaN(Date.parse(timestamp)));
});

run('normalizeDatasetRow maps a valid dataset row', () => {
  const result = normalizeDatasetRow({
    incident_id: 'INC000999',
    timestamp: 45541.36041666667,
    date: 45541,
    time: '08:39:00',
    latitude: 9.075,
    longitude: 7.398,
    severity_class: 'Damage',
    road_type: 'Highway',
    weather_type: 'Rain',
    vehicles_involved: 3,
    casualties_count: 1,
    holiday_flag: 1,
  }, {
    sourceDataset: 'road_safety_dataset_test',
    importRunId: 'run_1',
    reporterUid: 'dataset_import_v1',
    importedAt: '2026-02-23T00:00:00.000Z',
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error('Expected successful normalization');
  }

  assert.equal(result.requestId, 'INC000999');
  assert.equal(result.accident.severity, 'Damage Only');
  assert.equal(result.accident.vehicle_count, 3);
  assert.equal(result.accident.casualty_count, 1);
  assert.equal(result.accident.reporter_uid, 'dataset_import_v1');
  assert.equal(result.features.source_dataset, 'road_safety_dataset_test');
  assert.equal(result.features.holiday_flag, true);
});

run('normalizeDatasetRow rejects invalid coordinates', () => {
  const result = normalizeDatasetRow({
    incident_id: 'INC1',
    timestamp: 45541.36041666667,
    latitude: 42,
    longitude: 100,
    severity_class: 'Fatal',
    road_type: 'Highway',
    weather_type: 'Clear',
    vehicles_involved: 1,
    casualties_count: 0,
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error('Expected failure');
  }
  assert.equal(result.reason, 'outside_nigeria_bounds');
});

run('normalizeDatasetRow rejects rows with missing request id', () => {
  const result = normalizeDatasetRow({
    incident_id: '',
    timestamp: 45541.36041666667,
    latitude: 9,
    longitude: 7,
    severity_class: 'Fatal',
    road_type: 'Highway',
    weather_type: 'Clear',
    vehicles_involved: 1,
    casualties_count: 0,
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error('Expected failure');
  }
  assert.equal(result.reason, 'missing_request_id');
});

console.log('All import dataset tests passed.');
