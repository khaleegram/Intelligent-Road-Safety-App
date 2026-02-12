import { auth } from './firebase';
import { adminRoleEndpoint } from '../config/env';

export async function updateUserAdminRole(params: {
  targetUid: string;
  isAdmin: boolean;
}): Promise<void> {
  if (!adminRoleEndpoint) {
    throw new Error('Admin role endpoint is not configured.');
  }

  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Sign in is required.');
  }

  const response = await fetch(adminRoleEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Role update failed.');
  }
}
