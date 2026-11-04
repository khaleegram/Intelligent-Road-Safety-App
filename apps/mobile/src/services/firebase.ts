import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { firebaseConfig, missingFirebaseKeys } from '../config/env';

if (missingFirebaseKeys.length > 0) {
  console.warn(`Missing Firebase env vars: ${missingFirebaseKeys.join(', ')}`);
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

type AuthPersistence = NonNullable<
  NonNullable<Parameters<typeof initializeAuth>[1]>['persistence']
>;

// The React Native build of @firebase/auth exports this; the default TypeScript
// entry does not. Metro resolves the `react-native` export condition at runtime.
const { getReactNativePersistence } = require('@firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => AuthPersistence;
};

function resolveAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Fast Refresh / repeated module evaluation: reuse the existing instance.
    return getAuth(app);
  }
}

export const db = getFirestore(app);
export const auth = resolveAuth();
export default app;
