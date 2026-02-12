import type { AccidentRecord } from '../types';
import { createAccident } from './firestore';
import { storage } from './storage';

const QUEUE_KEY = 'accident_queue_v1';

export type QueuedAccident = AccidentRecord & { queued_at: string };

export const offlineQueue = {
  async enqueue(accident: AccidentRecord): Promise<void> {
    const queue = await storage.get<QueuedAccident[]>(QUEUE_KEY, []);
    const queued: QueuedAccident = {
      ...accident,
      queued_at: new Date().toISOString(),
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

    await storage.set(QUEUE_KEY, queue);
  },

  async getAll(): Promise<QueuedAccident[]> {
    return storage.get<QueuedAccident[]>(QUEUE_KEY, []);
  },

  async clear(): Promise<void> {
    await storage.remove(QUEUE_KEY);
  },

  async sync(): Promise<{ synced: number; failed: number }> {
    const queue = await storage.get<QueuedAccident[]>(QUEUE_KEY, []);
    if (queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    const remaining: QueuedAccident[] = [];
    let synced = 0;

    for (const item of queue) {
      try {
        const { queued_at, ...record } = item;
        await createAccident(record);
        synced += 1;
      } catch {
        remaining.push(item);
      }
    }

    if (remaining.length === 0) {
      await storage.remove(QUEUE_KEY);
    } else {
      await storage.set(QUEUE_KEY, remaining);
    }

    return { synced, failed: remaining.length };
  },
};
