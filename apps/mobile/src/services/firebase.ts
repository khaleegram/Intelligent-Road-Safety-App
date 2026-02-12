import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { firebaseConfig, missingFirebaseKeys } from '../config/env';

if (missingFirebaseKeys.length > 0) {
  console.warn(`Missing Firebase env vars: ${missingFirebaseKeys.join(', ')}`);
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
