import { FirebaseError } from 'firebase/app';

/** True when Firestore rejected the call for security rules / auth. */
export const isPermissionDenied = (error: unknown): boolean => {
  if (error instanceof FirebaseError) return error.code === 'permission-denied';
  if (!(error instanceof Error)) return false;
  return /insufficient permissions|permission-denied|PERMISSION_DENIED/i.test(error.message);
};

export const isTimeoutError = (error: unknown): boolean =>
  error instanceof Error && /timed out after/i.test(error.message);
