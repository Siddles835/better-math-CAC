import { describe, expect, it } from 'vitest';
import {
  ACTIVE_ROLE_KEY,
  ACTIVE_STUDENT_KEY,
  ACTIVE_TEACHER_KEY,
  LAST_CLASS_CODE_KEY,
} from './session';
import {
  applyNativeRestore,
  mirrorSetActiveStudent,
  mirrorSetActiveTeacher,
  persistNativeSessionWrite,
  type NativeSessionStore,
} from './sessionNativePersist';

const studentJson = JSON.stringify({ classCode: 'AB12', nickname: 'Ava' });
const teacherJson = JSON.stringify({ classCode: 'AB12' });

describe('persistNativeSessionWrite (iOS Keychain mirror)', () => {
  it('keeps the student session when login clears the teacher key', () => {
    // This is the background-logout bug: setActiveStudent ends with
    // removeItem(ACTIVE_TEACHER_KEY). The old Swift path treated that as
    // "teacher signed out" and also deleted the student + role from Keychain.
    const store = mirrorSetActiveStudent({}, studentJson, 'AB12');

    expect(store[ACTIVE_STUDENT_KEY]).toBe(studentJson);
    expect(store[ACTIVE_ROLE_KEY]).toBe('student');
    expect(store[ACTIVE_TEACHER_KEY]).toBeUndefined();
    expect(store[LAST_CLASS_CODE_KEY]).toBe('AB12');
  });

  it('keeps the teacher session when login clears the student key', () => {
    const store = mirrorSetActiveTeacher(
      {
        [ACTIVE_STUDENT_KEY]: studentJson,
        [ACTIVE_ROLE_KEY]: 'student',
      },
      teacherJson
    );

    expect(store[ACTIVE_TEACHER_KEY]).toBe(teacherJson);
    expect(store[ACTIVE_ROLE_KEY]).toBe('teacher');
    expect(store[ACTIVE_STUDENT_KEY]).toBeUndefined();
  });

  it('sign-out of student only clears student role keys', () => {
    let store: NativeSessionStore = mirrorSetActiveStudent({}, studentJson, 'AB12');
    store = persistNativeSessionWrite(store, ACTIVE_STUDENT_KEY, null);
    if (store[ACTIVE_ROLE_KEY] === 'student') {
      store = persistNativeSessionWrite(store, ACTIVE_ROLE_KEY, null);
    }

    expect(store[ACTIVE_STUDENT_KEY]).toBeUndefined();
    expect(store[ACTIVE_ROLE_KEY]).toBeUndefined();
    expect(store[LAST_CLASS_CODE_KEY]).toBe('AB12');
  });

  it('clearing teacher while student is active does not wipe student', () => {
    const afterStudent = persistNativeSessionWrite({}, ACTIVE_STUDENT_KEY, studentJson);
    const afterClearTeacher = persistNativeSessionWrite(afterStudent, ACTIVE_TEACHER_KEY, null);

    expect(afterClearTeacher[ACTIVE_STUDENT_KEY]).toBe(studentJson);
    expect(afterClearTeacher[ACTIVE_ROLE_KEY]).toBe('student');
    expect(afterClearTeacher[ACTIVE_TEACHER_KEY]).toBeUndefined();
  });
});

describe('applyNativeRestore (nil vs value)', () => {
  it('does not clear local session when Keychain reads are notFound', () => {
    const local: NativeSessionStore = {
      [ACTIVE_STUDENT_KEY]: studentJson,
      [ACTIVE_ROLE_KEY]: 'student',
    };
    const next = applyNativeRestore(local, {
      [ACTIVE_STUDENT_KEY]: { status: 'notFound' },
      [ACTIVE_TEACHER_KEY]: { status: 'notFound' },
      [ACTIVE_ROLE_KEY]: { status: 'notFound' },
      [LAST_CLASS_CODE_KEY]: { status: 'notFound' },
    });
    expect(next[ACTIVE_STUDENT_KEY]).toBe(studentJson);
    expect(next[ACTIVE_ROLE_KEY]).toBe('student');
  });

  it('does not clear local session when Keychain is locked', () => {
    const local: NativeSessionStore = {
      [ACTIVE_STUDENT_KEY]: studentJson,
      [ACTIVE_ROLE_KEY]: 'student',
    };
    const next = applyNativeRestore(local, {
      [ACTIVE_STUDENT_KEY]: { status: 'interactionNotAllowed' },
      [ACTIVE_TEACHER_KEY]: { status: 'interactionNotAllowed' },
      [ACTIVE_ROLE_KEY]: { status: 'interactionNotAllowed' },
      [LAST_CLASS_CODE_KEY]: { status: 'interactionNotAllowed' },
    });
    expect(next[ACTIVE_STUDENT_KEY]).toBe(studentJson);
  });

  it('restores positive Keychain values into empty local storage', () => {
    const next = applyNativeRestore({}, {
      [ACTIVE_STUDENT_KEY]: { status: 'value', value: studentJson },
      [ACTIVE_ROLE_KEY]: { status: 'value', value: 'student' },
      [LAST_CLASS_CODE_KEY]: { status: 'value', value: 'AB12' },
      [ACTIVE_TEACHER_KEY]: { status: 'notFound' },
    });
    expect(next[ACTIVE_STUDENT_KEY]).toBe(studentJson);
    expect(next[ACTIVE_ROLE_KEY]).toBe('student');
    expect(next[LAST_CLASS_CODE_KEY]).toBe('AB12');
    expect(next[ACTIVE_TEACHER_KEY]).toBeUndefined();
  });
});
