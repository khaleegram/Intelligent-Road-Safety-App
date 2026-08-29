import type { LocalAlert } from '../types';
import { storage } from './storage';

const STORAGE_KEY = 'local_alerts_v1';
const MAX_ALERTS = 50;

export async function pushLocalAlert(
  alert: Omit<LocalAlert, 'id' | 'created_at'> & { id?: string; created_at?: string }
): Promise<LocalAlert> {
  const existing = await storage.get<LocalAlert[]>(STORAGE_KEY, []);
  const entry: LocalAlert = {
    id: alert.id ?? `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: alert.title,
    message: alert.message,
    type: alert.type,
    created_at: alert.created_at ?? new Date().toISOString(),
  };
  const next = [entry, ...existing].slice(0, MAX_ALERTS);
  await storage.set(STORAGE_KEY, next);
  return entry;
}

export async function fetchLocalAlerts(): Promise<LocalAlert[]> {
  const items = await storage.get<LocalAlert[]>(STORAGE_KEY, []);
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
