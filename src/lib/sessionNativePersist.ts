/**
 * Reference implementation of iOS MathLiftKeychain.persistWebStorage /
 * restoreScript (ios/ContentView.swift). Kept in TS so exclusivity + restore
 * invariants are regression-tested without an XCTest target.
 */

import {
  ACTIVE_ROLE_KEY,
  ACTIVE_STUDENT_KEY,
  ACTIVE_TEACHER_KEY,
  LAST_CLASS_CODE_KEY,
  type SessionKey,
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

export type KeychainReadResult =
  | { status: 'value'; value: string }
  | { status: 'notFound' }
  | { status: 'interactionNotAllowed' }
  | { status: 'error'; code: number };

/**
 * Apply a Keychain restore into a web localStorage mirror.
 *
 * Nil / notFound / locked reads NEVER remove existing keys. Only positive
 * values are written. Matches MathLiftKeychain.restoreScript().
 */
export const applyNativeRestore = (
  local: NativeSessionStore,
  keychain: Partial<Record<SessionKey, KeychainReadResult>>
): NativeSessionStore => {
  const next: NativeSessionStore = { ...local };

  const positive = (result: KeychainReadResult | undefined): string | null => {
    if (!result || result.status !== 'value') return null;
    return result.value.length > 0 ? result.value : null;
  };

  let student = positive(keychain[ACTIVE_STUDENT_KEY]);
  let teacher = positive(keychain[ACTIVE_TEACHER_KEY]);
  let role = positive(keychain[ACTIVE_ROLE_KEY]);
  const lastClass = positive(keychain[LAST_CLASS_CODE_KEY]);

  if (student && teacher) {
    if (role === 'teacher') student = null;
    else {
      teacher = null;
      role = 'student';
    }
  }

  if (student) next[ACTIVE_STUDENT_KEY] = student;
  if (teacher) next[ACTIVE_TEACHER_KEY] = teacher;
  if (role) next[ACTIVE_ROLE_KEY] = role;
  if (lastClass) next[LAST_CLASS_CODE_KEY] = lastClass;

  return next;
};
