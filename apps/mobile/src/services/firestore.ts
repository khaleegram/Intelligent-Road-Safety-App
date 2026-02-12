import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { auth, db } from './firebase';
import type { AccidentRecord, AdminAlert, HotspotRecord, UserProfile } from '../types';
import { storage } from './storage';
import { generateRequestId } from './requestId';

const accidentsCollection = collection(db, 'accidents');
const hotspotsCollection = collection(db, 'hotspots');
const usersCollection = collection(db, 'users');
const alertsCollection = collection(db, 'admin_alerts');
const HOTSPOTS_CACHE_KEY = 'hotspots_cache_v1';
const ACCIDENTS_CACHE_KEY = 'accidents_cache_v1';

export async function fetchAccidents(): Promise<AccidentRecord[]> {
  try {
    const snapshot = await getDocs(
      query(accidentsCollection, orderBy('created_at', 'desc'))
    );
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<AccidentRecord, 'id'>),
    }));
    await storage.set(ACCIDENTS_CACHE_KEY, data);
    return data;
  } catch (error) {
    console.error('Failed to fetch accidents', error);
    const cached = await storage.get<AccidentRecord[]>(ACCIDENTS_CACHE_KEY, []);
    if (cached.length > 0) {
      return cached;
    }
    throw new Error('Unable to load accident data. Check your connection.');
  }
}

export async function fetchHotspots(): Promise<HotspotRecord[]> {
  try {
    const snapshot = await getDocs(
      query(hotspotsCollection, orderBy('last_updated', 'desc'))
    );
    const data = snapshot.docs.map((doc) => ({
      ...(doc.data() as HotspotRecord),
    }));
    await storage.set(HOTSPOTS_CACHE_KEY, data);
    return data;
  } catch (error) {
    console.error('Failed to fetch hotspots', error);
    const cached = await storage.get<HotspotRecord[]>(HOTSPOTS_CACHE_KEY, []);
    if (cached.length > 0) {
      return cached;
    }
    throw new Error('Unable to load hotspots. Check your connection.');
  }
}

export async function createAccident(input: AccidentRecord): Promise<string> {
  try {
    const reporterUid = auth.currentUser?.uid;
    if (!reporterUid) {
      throw new Error('Sign in is required to submit a report.');
    }

    const requestId = input.request_id ?? generateRequestId();
    const accidentRef = doc(db, 'accidents', requestId);
    const payload = {
      ...input,
      request_id: requestId,
      created_at: input.created_at ?? new Date().toISOString(),
      reporter_uid: reporterUid,
    };

    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(accidentRef);
      if (!existing.exists()) {
        transaction.set(accidentRef, payload);
      }
    });
    return requestId;
  } catch (error) {
    console.error('Failed to create accident', error);
    throw new Error('Unable to submit accident report. Try again.');
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
  } catch (error) {
    console.error('Failed to update verification', error);
    throw new Error('Unable to update verification status.');
  }
}
