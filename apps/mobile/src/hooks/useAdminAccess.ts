import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { auth } from '../services/firebase';
import { isUserAdmin } from '../services/userProfile';

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
      if (!currentUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(await isUserAdmin(currentUser.uid));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, isAdmin, loading };
};
