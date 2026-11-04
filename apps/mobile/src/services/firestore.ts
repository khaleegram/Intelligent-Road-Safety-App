import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { auth, db } from './firebase';
import type {
  AccidentFeatures,
  AccidentRecord,
  AdminAlert,
  HotspotRecord,
  SemInsight,
  UserProfile,
} from '../types';
import { storage } from './storage';
import { generateRequestId } from './requestId';
import { cleanFeatures } from './reportValidation';

const accidentsCollection = collection(db, 'accidents');
const hotspotsCollection = collection(db, 'hotspots');
const usersCollection = collection(db, 'users');
const alertsCollection = collection(db, 'admin_alerts');
const HOTSPOTS_CACHE_KEY = 'hotspots_cache_v1';
const ACCIDENTS_CACHE_KEY = 'accidents_cache_v1';
const MEMO_TTL_MS = 60_000;

let accidentsMemo: AccidentRecord[] | null = null;
let accidentsMemoAt = 0;
let accidentsRequest: Promise<AccidentRecord[]> | null = null;

let hotspotsMemo: HotspotRecord[] | null = null;
let hotspotsMemoAt = 0;
let hotspotsRequest: Promise<HotspotRecord[]> | null = null;

/** Instant local snapshot used to paint the UI before the network answers. */
export async function readCachedAccidents(): Promise<AccidentRecord[]> {
  return storage.get<AccidentRecord[]>(ACCIDENTS_CACHE_KEY, []);
}

export async function readCachedHotspots(): Promise<HotspotRecord[]> {
  return storage.get<HotspotRecord[]>(HOTSPOTS_CACHE_KEY, []);
}

export function invalidateAccidentCache(): void {
  accidentsMemo = null;
  accidentsMemoAt = 0;
}

export async function fetchAccidents(options: { force?: boolean } = {}): Promise<AccidentRecord[]> {
  const now = Date.now();
  if (!options.force && accidentsMemo && now - accidentsMemoAt < MEMO_TTL_MS) {
    return accidentsMemo;
  }
  if (!options.force && accidentsRequest) {
    return accidentsRequest;
  }

  const request = (async () => {
    try {
      const snapshot = await getDocs(
        query(accidentsCollection, orderBy('created_at', 'desc'))
      );
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<AccidentRecord, 'id'>),
      }));
      accidentsMemo = data;
      accidentsMemoAt = Date.now();
      await storage.set(ACCIDENTS_CACHE_KEY, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch accidents', error);
      const cached = await storage.get<AccidentRecord[]>(ACCIDENTS_CACHE_KEY, []);
      if (cached.length > 0) {
        accidentsMemo = cached;
        accidentsMemoAt = Date.now();
        return cached;
      }
      throw new Error('Unable to load accident data. Check your connection.');
    } finally {
      accidentsRequest = null;
    }
  })();

  accidentsRequest = request;
  return request;
}

export async function fetchHotspots(options: { force?: boolean } = {}): Promise<HotspotRecord[]> {
  const now = Date.now();
  if (!options.force && hotspotsMemo && now - hotspotsMemoAt < MEMO_TTL_MS) {
    return hotspotsMemo;
  }
  if (!options.force && hotspotsRequest) {
    return hotspotsRequest;
  }

  const request = (async () => {
    try {
      const snapshot = await getDocs(
        query(hotspotsCollection, orderBy('last_updated', 'desc'))
      );
      const data = snapshot.docs.map((doc) => ({
        ...(doc.data() as HotspotRecord),
      }));
      hotspotsMemo = data;
      hotspotsMemoAt = Date.now();
      await storage.set(HOTSPOTS_CACHE_KEY, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch hotspots', error);
      const cached = await storage.get<HotspotRecord[]>(HOTSPOTS_CACHE_KEY, []);
      if (cached.length > 0) {
        hotspotsMemo = cached;
        hotspotsMemoAt = Date.now();
        return cached;
      }
      throw new Error('Unable to load hotspots. Check your connection.');
    } finally {
      hotspotsRequest = null;
    }
  })();

  hotspotsRequest = request;
  return request;
}

export async function createAccident(input: AccidentRecord): Promise<string> {
  try {
    const reporterUid = auth.currentUser?.uid;
    if (!reporterUid) {
      throw new Error('Sign in is required to submit a report.');
    }

    const requestId = input.request_id ?? generateRequestId();
    const accidentRef = doc(db, 'accidents', requestId);
    const createdAt = input.created_at ?? new Date().toISOString();
    // Only write fields allowed by the `accidents` security rule.
    const payload = {
      latitude: input.latitude,
      longitude: input.longitude,
      timestamp: input.timestamp,
      severity: input.severity,
      road_type: input.road_type,
      weather: input.weather,
      vehicle_count: input.vehicle_count,
      casualty_count: input.casualty_count,
      created_at: createdAt,
      request_id: requestId,
      reporter_uid: reporterUid,
    };
    const cleanedFeatures = cleanFeatures(input.features);
    const featurePayload: (AccidentFeatures & {
      request_id: string;
      reporter_uid: string;
      created_at: string;
    }) | null = cleanedFeatures
      ? {
          ...cleanedFeatures,
          request_id: requestId,
          reporter_uid: reporterUid,
          created_at: createdAt,
        }
      : null;

    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(accidentRef);
      if (!existing.exists()) {
        transaction.set(accidentRef, payload);
        if (featurePayload) {
          transaction.set(doc(db, 'accident_features', requestId), featurePayload);
        }
      }
    });
    invalidateAccidentCache();
    return requestId;
  } catch (error) {
    console.error('Failed to create accident', error);
    throw new Error('Unable to submit accident report. Try again.');
  }
}

export async function fetchSemInsights(): Promise<SemInsight | null> {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'sem_insights'), limit(1))
    );
    if (snapshot.empty) return null;
    const item = snapshot.docs[0];
    return {
      id: item.id,
      ...(item.data() as Omit<SemInsight, 'id'>),
    };
  } catch (error) {
    console.error('Failed to fetch SEM insights', error);
    return null;
  }
}

export async function fetchUsers(): Promise<UserProfile[]> {
  try {
    const snapshot = await getDocs(usersCollection);
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<UserProfile, 'id'>),
    }));
    return data.sort((a, b) => {
      const aTime = Date.parse(a.last_sign_in ?? a.created_at ?? '');
      const bTime = Date.parse(b.last_sign_in ?? b.created_at ?? '');
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Failed to fetch users', error);
    throw new Error('Unable to load user data. Check your connection.');
  }
}

export async function fetchAdminAlerts(): Promise<AdminAlert[]> {
  try {
    const snapshot = await getDocs(query(alertsCollection, orderBy('created_at', 'desc')));
    return snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<AdminAlert, 'id'>),
    }));
  } catch (error) {
    console.error('Failed to fetch admin alerts', error);
    throw new Error('Unable to load admin alerts.');
  }
}

export async function fetchAccidentById(accidentId: string): Promise<AccidentRecord | null> {
  try {
    const snapshot = await getDoc(doc(db, 'accidents', accidentId));
    if (!snapshot.exists()) {
      return null;
    }
    return {
      id: snapshot.id,
      ...(snapshot.data() as Omit<AccidentRecord, 'id'>),
    };
  } catch (error) {
    console.error('Failed to fetch accident by id', error);
    throw new Error('Unable to load accident details. Check your connection.');
  }
}

export async function fetchHotspotById(hotspotId: string): Promise<HotspotRecord | null> {
  try {
    const snapshot = await getDoc(doc(db, 'hotspots', hotspotId));
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as HotspotRecord;
  } catch (error) {
    console.error('Failed to fetch hotspot by id', error);
    throw new Error('Unable to load hotspot details. Check your connection.');
  }
}

export async function updateAccidentVerification(params: {
  accidentId: string;
  verified: boolean;
  notes?: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user?.uid) {
    throw new Error('Sign in is required.');
  }

  try {
    await updateDoc(doc(db, 'accidents', params.accidentId), {
      verified: params.verified,
      verified_by: user.uid,
      verified_at: serverTimestamp(),
      notes: params.notes?.trim() ?? '',
    });
    invalidateAccidentCache();
  } catch (error) {
    console.error('Failed to update verification', error);
    throw new Error('Unable to update verification status.');
  }
}
