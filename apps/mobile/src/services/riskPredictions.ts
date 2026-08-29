import { collection, getDocs, orderBy, query } from 'firebase/firestore';

import type { RiskPrediction } from '../types';
import { db } from './firebase';
import { storage } from './storage';

const CACHE_KEY = 'risk_predictions_cache_v1';

export async function fetchRiskPredictions(): Promise<RiskPrediction[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'risk_predictions'), orderBy('updated_at', 'desc'))
    );
    const items: RiskPrediction[] = snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as Omit<RiskPrediction, 'cell_id'>),
      cell_id: docSnap.id,
    }));
    await storage.set(CACHE_KEY, items);
    return items;
  } catch {
    return storage.get<RiskPrediction[]>(CACHE_KEY, []);
  }
}
