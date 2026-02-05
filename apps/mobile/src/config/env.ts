import Constants from 'expo-constants';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
};

type AppExtra = {
  mapboxToken?: string;
  firebase?: Partial<FirebaseConfig>;
};

const extra = (Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {}) as AppExtra;

const getEnvValue = (key: string, fallback = '') => {
  return process.env[key] ?? fallback;
};

export const mapboxToken = getEnvValue(
  'EXPO_PUBLIC_MAPBOX_TOKEN',
  extra.mapboxToken ?? ''
);

export const firebaseConfig: FirebaseConfig = {
  apiKey: getEnvValue('EXPO_PUBLIC_FIREBASE_API_KEY', extra.firebase?.apiKey ?? ''),
  authDomain: getEnvValue(
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    extra.firebase?.authDomain ?? ''
  ),
  projectId: getEnvValue(
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    extra.firebase?.projectId ?? ''
  ),
  storageBucket: getEnvValue(
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    extra.firebase?.storageBucket ?? ''
  ),
  messagingSenderId: getEnvValue(
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    extra.firebase?.messagingSenderId ?? ''
  ),
  appId: getEnvValue('EXPO_PUBLIC_FIREBASE_APP_ID', extra.firebase?.appId ?? ''),
  measurementId: getEnvValue(
    'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',
    extra.firebase?.measurementId ?? ''
  ),
};

export const missingFirebaseKeys = [
  !firebaseConfig.apiKey && 'EXPO_PUBLIC_FIREBASE_API_KEY',
  !firebaseConfig.authDomain && 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  !firebaseConfig.projectId && 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  !firebaseConfig.storageBucket && 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  !firebaseConfig.messagingSenderId && 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  !firebaseConfig.appId && 'EXPO_PUBLIC_FIREBASE_APP_ID',
  !firebaseConfig.measurementId && 'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',
].filter(Boolean) as string[];
