import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { db } from './firebase';
import { getExpoPushToken } from './notifications';

export async function upsertUserProfile(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  const pushToken = await getExpoPushToken();

  const pushFields =
    pushToken != null
      ? {
          expo_push_token: pushToken,
          push_token_updated_at: new Date().toISOString(),
        }
      : {};

  if (!snapshot.exists()) {
    await setDoc(ref, {
      email: user.email?.toLowerCase() ?? '',
      created_at: new Date().toISOString(),
      last_sign_in: new Date().toISOString(),
      ...pushFields,
    });
    return;
  }

  await setDoc(
    ref,
    {
      email: user.email?.toLowerCase() ?? '',
      last_sign_in: new Date().toISOString(),
      ...pushFields,
    },
    { merge: true }
  );
}

export async function isUserAdmin(uid: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() && snapshot.data()?.is_admin === true;
}
