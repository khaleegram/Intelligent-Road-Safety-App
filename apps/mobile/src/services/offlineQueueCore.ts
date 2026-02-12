import type { AccidentRecord } from '../types';
import { generateRequestId } from './requestId';

const QUEUE_KEY = 'accident_queue_v1';

export type QueuedAccident = AccidentRecord & { queued_at: string };

export type QueueStorageClient = {
  get<T>(key: string, fallback: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
};

export type SubmitAccident = (accident: AccidentRecord) => Promise<string>;
type QueueClock = () => string;
type QueueIdGenerator = () => string;

export function createOfflineQueue(options: {
  storageClient: QueueStorageClient;
  submitAccident: SubmitAccident;
  now?: QueueClock;
  idGenerator?: QueueIdGenerator;
}) {
  const storageClient = options.storageClient;
  const submitAccident = options.submitAccident;
  const now = options.now ?? (() => new Date().toISOString());
  const idGenerator = options.idGenerator ?? generateRequestId;

  return {
    async enqueue(accident: AccidentRecord): Promise<void> {
      const queue = await storageClient.get<QueuedAccident[]>(QUEUE_KEY, []);
      const queued: QueuedAccident = {
        ...accident,
        request_id: accident.request_id ?? idGenerator(),
        queued_at: now(),
      };

      if (queued.request_id) {
        const existingIndex = queue.findIndex(
          (item) => item.request_id === queued.request_id
        );
        if (existingIndex >= 0) {
          queue[existingIndex] = queued;
        } else {
          queue.push(queued);
        }
      } else {
        queue.push(queued);
      }

      await storageClient.set(QUEUE_KEY, queue);
    },

    async getAll(): Promise<QueuedAccident[]> {
      return storageClient.get<QueuedAccident[]>(QUEUE_KEY, []);
    },

    async clear(): Promise<void> {
      await storageClient.remove(QUEUE_KEY);
    },

    async sync(): Promise<{ synced: number; failed: number }> {
      const queue = await storageClient.get<QueuedAccident[]>(QUEUE_KEY, []);
      if (queue.length === 0) {
        return { synced: 0, failed: 0 };
      }

      const remaining: QueuedAccident[] = [];
      let synced = 0;

      for (const item of queue) {
        try {
          const { queued_at, ...record } = item;
          await submitAccident(record);
          synced += 1;
        } catch {
          remaining.push(item);
        }
      }

      if (remaining.length === 0) {
        await storageClient.remove(QUEUE_KEY);
      } else {
        await storageClient.set(QUEUE_KEY, remaining);
      }

      return { synced, failed: remaining.length };
    },
  };
}
