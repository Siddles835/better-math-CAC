import { describe, expect, it } from 'vitest';
import { FirebaseError } from 'firebase/app';
import { isPermissionDenied, isTimeoutError } from './firebaseErrors';

describe('firebaseErrors', () => {
  it('detects permission-denied from FirebaseError and message text', () => {
    expect(isPermissionDenied(new FirebaseError('permission-denied', 'nope'))).toBe(true);
    expect(isPermissionDenied(new Error('Missing or insufficient permissions.'))).toBe(true);
    expect(isPermissionDenied(new Error('network down'))).toBe(false);
  });

  it('detects timeout labels from withTimeout', () => {
    expect(isTimeoutError(new Error('firestore.listCurricula timed out after 8000ms'))).toBe(true);
    expect(isTimeoutError(new Error('boom'))).toBe(false);
  });
});
