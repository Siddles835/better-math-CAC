/**
 * Reference implementation of iOS MathLiftKeychain.persistWebStorage
 * (ios/ContentView.swift). Kept in TS so the exclusivity rules that prevent
 * background logout are regression-tested without an XCTest target.
 */

import {
  ACTIVE_ROLE_KEY,
  ACTIVE_STUDENT_KEY,
  ACTIVE_TEACHER_KEY,
  LAST_CLASS_CODE_KEY,
} from './session';

export type NativeSessionStore = Record<string, string | undefined>;

/** Apply one storage write the way the iOS Keychain bridge must. */
export const persistNativeSessionWrite = (
  store: NativeSessionStore,
  key: string,
  json: string | null | undefined
): NativeSessionStore => {
  const next: NativeSessionStore = { ...store };
  const hasValue = typeof json === 'string' && json.length > 0;

  if (key === ACTIVE_STUDENT_KEY) {
    if (hasValue) {
      next[ACTIVE_STUDENT_KEY] = json!;
      delete next[ACTIVE_TEACHER_KEY];
      next[ACTIVE_ROLE_KEY] = 'student';
    } else {
      delete next[ACTIVE_STUDENT_KEY];
      if (next[ACTIVE_ROLE_KEY] === 'student') {
        delete next[ACTIVE_ROLE_KEY];
      }
    }
    return next;
  }

  if (key === ACTIVE_TEACHER_KEY) {
    if (hasValue) {
      next[ACTIVE_TEACHER_KEY] = json!;
      delete next[ACTIVE_STUDENT_KEY];
      next[ACTIVE_ROLE_KEY] = 'teacher';
    } else {
      delete next[ACTIVE_TEACHER_KEY];
      if (next[ACTIVE_ROLE_KEY] === 'teacher') {
        delete next[ACTIVE_ROLE_KEY];
      }
    }
    return next;
  }

  if (key === ACTIVE_ROLE_KEY) {
    if (hasValue) {
      next[ACTIVE_ROLE_KEY] = json!;
      if (json === 'student') delete next[ACTIVE_TEACHER_KEY];
      if (json === 'teacher') delete next[ACTIVE_STUDENT_KEY];
    } else {
      delete next[ACTIVE_ROLE_KEY];
    }
    return next;
  }

  if (key === LAST_CLASS_CODE_KEY || key.startsWith('better-math:')) {
    if (hasValue) next[key] = json!;
    else delete next[key];
  }

  return next;
};

/**
 * Replay the localStorage writes that `setActiveStudent` / `setActiveTeacher`
 * emit (set role key, clear the other role).
 */
export const mirrorSetActiveStudent = (
  store: NativeSessionStore,
  sessionJson: string,
  classCode?: string
): NativeSessionStore => {
  let next = persistNativeSessionWrite(store, ACTIVE_STUDENT_KEY, sessionJson);
  next = persistNativeSessionWrite(next, ACTIVE_ROLE_KEY, 'student');
  next = persistNativeSessionWrite(next, ACTIVE_TEACHER_KEY, null);
  if (classCode) {
    next = persistNativeSessionWrite(next, LAST_CLASS_CODE_KEY, classCode);
  }
  return next;
};

export const mirrorSetActiveTeacher = (
  store: NativeSessionStore,
  sessionJson: string
): NativeSessionStore => {
  let next = persistNativeSessionWrite(store, ACTIVE_TEACHER_KEY, sessionJson);
  next = persistNativeSessionWrite(next, ACTIVE_ROLE_KEY, 'teacher');
  next = persistNativeSessionWrite(next, ACTIVE_STUDENT_KEY, null);
  return next;
};
