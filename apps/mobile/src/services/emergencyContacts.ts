import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
} from 'firebase/firestore';

import type { EmergencyContact } from '../types';
import { auth, db } from './firebase';
import { storage } from './storage';

const STORAGE_KEY = 'emergency_contacts_v1';

function contactsRef(uid: string) {
  return collection(db, 'users', uid, 'emergency_contacts');
}

async function mirrorToStorage(contacts: EmergencyContact[]): Promise<void> {
  await storage.set(STORAGE_KEY, contacts);
}

export async function listContacts(): Promise<EmergencyContact[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    return storage.get<EmergencyContact[]>(STORAGE_KEY, []);
  }

  try {
    const snapshot = await getDocs(contactsRef(uid));
    const contacts: EmergencyContact[] = snapshot.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Omit<EmergencyContact, 'id'>),
    }));
    await mirrorToStorage(contacts);
    return contacts;
  } catch {
    return storage.get<EmergencyContact[]>(STORAGE_KEY, []);
  }
}

export async function addContact(
  contact: Omit<EmergencyContact, 'id' | 'created_at'>
): Promise<EmergencyContact> {
  const uid = auth.currentUser?.uid;
  const created_at = new Date().toISOString();
  const entry: EmergencyContact = {
    ...contact,
    created_at,
  };

  if (uid) {
    try {
      const ref = await addDoc(contactsRef(uid), {
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship ?? null,
        created_at,
      });
      entry.id = ref.id;
    } catch {
      // Fall through to local-only save.
    }
  }

  const existing = await storage.get<EmergencyContact[]>(STORAGE_KEY, []);
  const next = [...existing, entry];
  await mirrorToStorage(next);
  return entry;
}

export async function deleteContact(id: string): Promise<void> {
  const uid = auth.currentUser?.uid;

  if (uid && id) {
    try {
      await deleteDoc(doc(db, 'users', uid, 'emergency_contacts', id));
    } catch {
      // Fall through to local delete.
    }
  }

  const existing = await storage.get<EmergencyContact[]>(STORAGE_KEY, []);
  await mirrorToStorage(existing.filter((item) => item.id !== id));
}
