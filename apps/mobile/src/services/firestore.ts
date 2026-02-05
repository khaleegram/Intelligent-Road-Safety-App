import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from './firebase';
import type { AccidentRecord, HotspotRecord } from '../types';
import { storage } from './storage';

const accidentsCollection = collection(db, 'accidents');
const hotspotsCollection = collection(db, 'hotspots');
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
    const payload = {
      ...input,
      created_at: input.created_at ?? new Date().toISOString(),
      server_created_at: serverTimestamp(),
    };

    const docRef = await addDoc(accidentsCollection, payload);
    return docRef.id;
  } catch (error) {
    console.error('Failed to create accident', error);
    throw new Error('Unable to submit accident report. Try again.');
  }
}
