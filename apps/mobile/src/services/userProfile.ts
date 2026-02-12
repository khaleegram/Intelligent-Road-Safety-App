import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { db } from './firebase';

export async function upsertUserProfile(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      email: user.email?.toLowerCase() ?? '',
      created_at: new Date().toISOString(),
      last_sign_in: new Date().toISOString(),
    });
    return;
  }

  await setDoc(
    ref,
    {
      email: user.email?.toLowerCase() ?? '',
      last_sign_in: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function isUserAdmin(uid: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() && snapshot.data()?.is_admin === true;
}
