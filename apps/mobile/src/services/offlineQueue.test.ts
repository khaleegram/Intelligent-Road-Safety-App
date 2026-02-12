import test from 'node:test';
import assert from 'node:assert/strict';

import type { AccidentRecord } from '../types';
import { createOfflineQueue } from './offlineQueueCore';

type MemoryStore = Record<string, unknown>;

const createStorageClient = () => {
  const store: MemoryStore = {};
  return {
    store,
    async get<T>(key: string, fallback: T): Promise<T> {
      return (key in store ? (store[key] as T) : fallback);
    },
    async set<T>(key: string, value: T): Promise<void> {
      store[key] = value;
    },
    async remove(key: string): Promise<void> {
      delete store[key];
    },
  };
};

const baseAccident: AccidentRecord = {
  latitude: 9.082,
  longitude: 8.6753,
  timestamp: '2026-02-12T00:00:00.000Z',
  severity: 'Minor',
  road_type: 'Urban',
  weather: 'Clear',
  vehicle_count: 1,
  casualty_count: 0,
  created_at: '2026-02-12T00:00:00.000Z',
  reporter_uid: 'researcher1',
};

test('offlineQueue assigns request_id and upserts duplicate items by request_id', async () => {
    const storageClient = createStorageClient();
    const queue = createOfflineQueue({
      storageClient,
      submitAccident: async () => 'ok',
      now: () => '2026-02-12T12:00:00.000Z',
      idGenerator: () => 'req_1',
    });

    await queue.enqueue(baseAccident);
    await queue.enqueue({ ...baseAccident, weather: 'Rain' });
    const all = await queue.getAll();

    assert.equal(all.length, 1);
    assert.equal(all[0].request_id, 'req_1');
    assert.equal(all[0].weather, 'Rain');
    assert.equal(all[0].queued_at, '2026-02-12T12:00:00.000Z');
});

test('offlineQueue syncs successful items and retains failures', async () => {
    const storageClient = createStorageClient();
    const submitted: string[] = [];
    const queue = createOfflineQueue({
      storageClient,
      submitAccident: async (accident) => {
        submitted.push(accident.request_id ?? 'none');
        if (accident.request_id === 'req_fail') {
          throw new Error('network');
        }
        return accident.request_id ?? 'req_ok';
      },
      now: () => '2026-02-12T12:00:00.000Z',
      idGenerator: () => 'generated',
    });

    await queue.enqueue({ ...baseAccident, request_id: 'req_ok' });
    await queue.enqueue({ ...baseAccident, request_id: 'req_fail' });
    const result = await queue.sync();
    const remaining = await queue.getAll();

    assert.deepEqual(submitted, ['req_ok', 'req_fail']);
    assert.deepEqual(result, { synced: 1, failed: 1 });
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].request_id, 'req_fail');
});
