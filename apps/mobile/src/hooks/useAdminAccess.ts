import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { adminEmails } from '../config/env';
import { auth, db } from '../services/firebase';

type AdminAccessState = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
};

export const useAdminAccess = (): AdminAccessState => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser?.email) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      if (adminEmails.includes(currentUser.email.toLowerCase())) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }
      const snapshot = await getDoc(doc(db, 'users', currentUser.uid));
      setIsAdmin(snapshot.exists() && snapshot.data()?.is_admin === true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, isAdmin, loading };
};
