import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const missingKeys: string[] = [];

if (!process.env.EXPO_PUBLIC_FIREBASE_API_KEY) missingKeys.push('EXPO_PUBLIC_FIREBASE_API_KEY');
if (!process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) missingKeys.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
if (!process.env.EXPO_PUBLIC_FIREBASE_APP_ID) missingKeys.push('EXPO_PUBLIC_FIREBASE_APP_ID');

if (missingKeys.length > 0) {
  console.warn(`Missing Firebase env vars: ${missingKeys.join(', ')}`);
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export default app;