import { addDoc, collection } from 'firebase/firestore';

import { auth, db } from './firebase';

type FeedbackInput = {
  message: string;
  rating?: number;
  locale: string;
};

export async function submitFeedback(input: FeedbackInput): Promise<void> {
  await addDoc(collection(db, 'feedback'), {
    message: input.message,
    rating: input.rating ?? null,
    locale: input.locale,
    uid: auth.currentUser?.uid ?? null,
    created_at: new Date().toISOString(),
  });
}
