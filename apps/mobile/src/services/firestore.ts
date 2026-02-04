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

const accidentsCollection = collection(db, 'accidents');
const hotspotsCollection = collection(db, 'hotspots');

export async function fetchAccidents(): Promise<AccidentRecord[]> {
  const snapshot = await getDocs(query(accidentsCollection, orderBy('created_at', 'desc')));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<AccidentRecord, 'id'>),
  }));
}

export async function fetchHotspots(): Promise<HotspotRecord[]> {
  const snapshot = await getDocs(query(hotspotsCollection, orderBy('last_updated', 'desc')));
  return snapshot.docs.map((doc) => ({
    ...(doc.data() as HotspotRecord),
  }));
}

export async function createAccident(input: AccidentRecord): Promise<string> {
  const payload = {
    ...input,
    created_at: input.created_at ?? new Date().toISOString(),
    server_created_at: serverTimestamp(),
  };

  const docRef = await addDoc(accidentsCollection, payload);
  return docRef.id;
}