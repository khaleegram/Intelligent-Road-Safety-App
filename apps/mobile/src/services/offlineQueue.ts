import { createAccident } from './firestore';
import { createOfflineQueue } from './offlineQueueCore';
import { storage } from './storage';

export { createOfflineQueue } from './offlineQueueCore';
export type { QueuedAccident } from './offlineQueueCore';

export const offlineQueue = createOfflineQueue({
  storageClient: storage,
  submitAccident: createAccident,
});
