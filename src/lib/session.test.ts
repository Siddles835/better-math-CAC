import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_ROLE_KEY,
  ACTIVE_STUDENT_KEY,
  ACTIVE_TEACHER_KEY,
  LAST_CLASS_CODE_KEY,
  SESSION_CHANGED,
  clearActiveStudent,
  clearActiveTeacher,
  getActiveStudent,
  getActiveTeacher,
  reconcileExclusiveSession,
  setActiveStudent,
  setActiveTeacher,
} from './session';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

describe('session localStorage helpers', () => {
  const storage = new MemoryStorage();

  afterEach(() => {
    storage.clear();
    vi.unstubAllGlobals();
  });

  const install = () => {
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', {
      localStorage: storage,
      dispatchEvent: vi.fn(),
    });
  };

  it('setActiveStudent removes teacher but keeps student readable', () => {
    install();
    setActiveTeacher({ classCode: 'T1' });
    setActiveStudent({ classCode: 'C1', nickname: 'Ava', displayName: 'Ava' });

    expect(getActiveStudent()).toEqual({
      classCode: 'C1',
      nickname: 'Ava',
      displayName: 'Ava',
    });
    expect(getActiveTeacher()).toBeNull();
    expect(localStorage.getItem(ACTIVE_ROLE_KEY)).toBe('student');
    expect(localStorage.getItem(LAST_CLASS_CODE_KEY)).toBe('C1');
    expect(localStorage.getItem(ACTIVE_TEACHER_KEY)).toBeNull();
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
    expect((window.dispatchEvent as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]).toMatchObject({
      type: SESSION_CHANGED,
    });
  });

  it('setActiveTeacher removes student but keeps teacher readable', () => {
    install();
    setActiveStudent({ classCode: 'C1', nickname: 'Ava' });
    setActiveTeacher({ classCode: 'T9', teacherCode: 'secret' });

    expect(getActiveTeacher()).toEqual({ classCode: 'T9' });
    expect(getActiveStudent()).toBeNull();
    expect(localStorage.getItem(ACTIVE_ROLE_KEY)).toBe('teacher');
    // PIN must not be persisted on device.
    expect(localStorage.getItem(ACTIVE_TEACHER_KEY)).toBe(JSON.stringify({ classCode: 'T9' }));
  });

  it('clearActiveStudent leaves last class code for re-entry', () => {
    install();
    setActiveStudent({ classCode: 'C1', nickname: 'Ava' });
    clearActiveStudent();
    expect(getActiveStudent()).toBeNull();
    expect(localStorage.getItem(ACTIVE_ROLE_KEY)).toBeNull();
    expect(localStorage.getItem(LAST_CLASS_CODE_KEY)).toBe('C1');
  });

  it('clearActiveTeacher does not revive a student session', () => {
    install();
    setActiveTeacher({ classCode: 'T9' });
    clearActiveTeacher();
    expect(getActiveTeacher()).toBeNull();
    expect(getActiveStudent()).toBeNull();
  });

  it('reconcileExclusiveSession drops the non-active role when both exist', () => {
    install();
    localStorage.setItem(ACTIVE_STUDENT_KEY, JSON.stringify({ classCode: 'C1', nickname: 'Ava' }));
    localStorage.setItem(ACTIVE_TEACHER_KEY, JSON.stringify({ classCode: 'T9' }));
    localStorage.setItem(ACTIVE_ROLE_KEY, 'student');
    reconcileExclusiveSession();
    expect(localStorage.getItem(ACTIVE_TEACHER_KEY)).toBeNull();
    expect(localStorage.getItem(ACTIVE_STUDENT_KEY)).toBeTruthy();
  });
});
