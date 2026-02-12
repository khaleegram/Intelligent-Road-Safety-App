import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAccidentRecord, validateReportDraft } from './reportValidation';

test('reportValidation rejects invalid coordinates', () => {
    const result = validateReportDraft({
      latitude: 'abc',
      longitude: '8.67',
      severity: 'Minor',
      roadType: 'Urban',
      weather: 'Clear',
      vehicleCount: 1,
      casualtyCount: 0,
    });

    assert.deepEqual(result, { ok: false, code: 'invalid_location' });
});

test('reportValidation builds normalized accident record', () => {
    const record = buildAccidentRecord(
      {
        latitude: '9.082',
        longitude: '8.6753',
        severity: 'Critical',
        roadType: '  Highway ',
        weather: ' Rain ',
        vehicleCount: 2,
        casualtyCount: 1,
        timestamp: '2026-02-10T08:00:00.000Z',
      },
      '2026-02-12T00:00:00.000Z'
    );

    assert.deepEqual(record, {
      latitude: 9.082,
      longitude: 8.6753,
      timestamp: '2026-02-10T08:00:00.000Z',
      severity: 'Critical',
      road_type: 'Highway',
      weather: 'Rain',
      vehicle_count: 2,
      casualty_count: 1,
      created_at: '2026-02-12T00:00:00.000Z',
    });
});
