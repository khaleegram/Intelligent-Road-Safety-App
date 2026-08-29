import * as Location from 'expo-location';
import { addDoc, collection } from 'firebase/firestore';

import type { BehaviourTrip } from '../types';
import { auth, db } from './firebase';
import { isOnline } from './connectivity';
import { storage } from './storage';

const CONSENT_KEY = 'behaviour_consent_v1';
const TRIPS_KEY = 'behaviour_trips_v1';
const CONSENT_VERSION = '1';

type ActiveTrip = {
  id: string;
  uid: string;
  started_at: string;
  harsh_events: number;
  distance_m: number;
  lastSpeed: number | null;
  subscription: Location.LocationSubscription | null;
};

let activeTrip: ActiveTrip | null = null;

export async function getConsent(): Promise<boolean> {
  return storage.get<boolean>(CONSENT_KEY, false);
}

export async function setConsent(enabled: boolean): Promise<void> {
  await storage.set(CONSENT_KEY, enabled);
  if (!enabled && activeTrip) {
    await endTripMonitoring();
  }
}

async function saveTripLocally(trip: BehaviourTrip): Promise<void> {
  const existing = await storage.get<BehaviourTrip[]>(TRIPS_KEY, []);
  await storage.set(TRIPS_KEY, [trip, ...existing].slice(0, 100));
}

async function syncTripToFirestore(trip: BehaviourTrip): Promise<void> {
  if (!(await isOnline())) return;
  try {
    await addDoc(collection(db, 'behaviour_trips'), trip);
  } catch {
    // Local copy already saved.
  }
}

export async function startTripMonitoring(): Promise<BehaviourTrip | null> {
  const consent = await getConsent();
  if (!consent || activeTrip) return null;

  const uid = auth.currentUser?.uid ?? 'anonymous';
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return null;
  }

  const tripId = `trip_${Date.now()}`;
  activeTrip = {
    id: tripId,
    uid,
    started_at: new Date().toISOString(),
    harsh_events: 0,
    distance_m: 0,
    lastSpeed: null,
    subscription: null,
  };

  activeTrip.subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 2000,
      distanceInterval: 5,
    },
    (position) => {
      if (!activeTrip) return;

      const speed = position.coords.speed ?? 0;
      if (activeTrip.lastSpeed !== null && activeTrip.lastSpeed - speed > 8) {
        activeTrip.harsh_events += 1;
      }
      if (activeTrip.lastSpeed !== null && speed >= 0) {
        activeTrip.distance_m += Math.max(0, speed * 2);
      }
      activeTrip.lastSpeed = speed;
    }
  );

  return {
    id: tripId,
    uid,
    started_at: activeTrip.started_at,
    ended_at: activeTrip.started_at,
    score: 100,
    harsh_events: 0,
    distance_m: 0,
    consent_version: CONSENT_VERSION,
  };
}

export async function endTripMonitoring(): Promise<BehaviourTrip | null> {
  if (!activeTrip) return null;

  activeTrip.subscription?.remove();
  const ended_at = new Date().toISOString();
  const score = Math.max(0, 100 - activeTrip.harsh_events * 8);
  const trip: BehaviourTrip = {
    id: activeTrip.id,
    uid: activeTrip.uid,
    started_at: activeTrip.started_at,
    ended_at,
    score,
    harsh_events: activeTrip.harsh_events,
    distance_m: Math.round(activeTrip.distance_m),
    consent_version: CONSENT_VERSION,
  };

  activeTrip = null;
  await saveTripLocally(trip);
  await syncTripToFirestore(trip);
  return trip;
}

export async function getLastTrip(): Promise<BehaviourTrip | null> {
  const trips = await storage.get<BehaviourTrip[]>(TRIPS_KEY, []);
  return trips[0] ?? null;
}

export function isTripActive(): boolean {
  return activeTrip !== null;
}
