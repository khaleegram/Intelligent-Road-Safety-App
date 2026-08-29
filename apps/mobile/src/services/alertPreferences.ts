import type { AlertPreferences } from '../types';
import { storage } from './storage';

const STORAGE_KEY = 'alert_prefs_v1';

const DEFAULTS: AlertPreferences = {
  enabled: true,
  radiusMeters: 200,
};

export async function getAlertPreferences(): Promise<AlertPreferences> {
  return storage.get(STORAGE_KEY, DEFAULTS);
}

export async function setAlertPreferences(prefs: AlertPreferences): Promise<void> {
  await storage.set(STORAGE_KEY, prefs);
}
