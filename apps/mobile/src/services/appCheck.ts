import { initializeAppCheck, CustomProvider } from 'firebase/app-check';

import app from './firebase';

let initialized = false;

/**
 * App Check wiring for go-live.
 * - __DEV__: uses EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN (register the same token in Firebase Console → App Check → Manage debug tokens).
 * - Release: enable Play Integrity / DeviceCheck in Console; prefer @react-native-firebase/app-check for production attestation.
 * Enforcement stays off until Console providers are configured — init is safe to call always.
 */
export async function initAppCheck(): Promise<void> {
  if (initialized) return;

  const debugToken =
    process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN?.trim() ?? '';

  if (__DEV__ && debugToken) {
    // Firebase JS SDK debug token hook (web/RN hybrid builds)
    (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      debugToken;
  }

  if (!debugToken && !__DEV__) {
    // Production without native attestation provider — skip rather than fail startup.
    console.warn(
      'App Check: no debug token and no native provider configured; skipping init. See docs/production-readiness.md'
    );
    return;
  }

  if (!debugToken) {
    return;
  }

  try {
    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => ({
          token: debugToken,
          expireTimeMillis: Date.now() + 60 * 60 * 1000,
        }),
      }),
      isTokenAutoRefreshEnabled: true,
    });
    initialized = true;
  } catch (error) {
    console.warn('App Check init failed (non-fatal)', error);
  }
}
