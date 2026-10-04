export const ACTIVE_STUDENT_KEY = 'better-math:active';
export const ACTIVE_TEACHER_KEY = 'better-math:active-teacher';
export const LAST_CLASS_CODE_KEY = 'better-math:last-class-code';
/** Only one role stays signed in on a shared classroom device. */
export const ACTIVE_ROLE_KEY = 'better-math:active-role';
export const SESSION_CHANGED = 'better-math:session-changed';

const SESSION_KEYS = [
  ACTIVE_STUDENT_KEY,
  ACTIVE_TEACHER_KEY,
  ACTIVE_ROLE_KEY,
  LAST_CLASS_CODE_KEY,
] as const;

export type SessionKey = (typeof SESSION_KEYS)[number];

export interface ActiveStudent {
  classCode: string;
  /** Firestore students map key */
  nickname: string;
  /** Optional display label (falls back to nickname) */
  displayName?: string;
  /** Device-only solo learner (no classroom / no email). */
  solo?: boolean;
}

export interface ActiveTeacher {
  classCode: string;
  teacherCode?: string;
}

export interface SessionSnapshot {
  student: string | null;
  teacher: string | null;
  role: string | null;
  lastClassCode: string | null;
}

const sessionDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    if (import.meta.env.DEV) return true;
    return window.localStorage.getItem('better-math:debug-session') === '1';
  } catch {
    return Boolean(import.meta.env.DEV);
  }
};

/** Dev-only console trail for every session read/write/clear. */
export const logSession = (action: string, reason: string, detail?: unknown) => {
  if (!sessionDebugEnabled()) return;
  if (detail !== undefined) {
    console.info(`[session] ${action} (${reason})`, detail);
  } else {
    console.info(`[session] ${action} (${reason})`);
  }
};

const safeGet = (key: string, reason: string): string | null => {
  try {
    const raw = localStorage.getItem(key);
    logSession('read', reason, { key, found: raw != null });
    return raw;
  } catch (err) {
    // Failed reads must never clear storage.
    logSession('read-failed', reason, { key, err: String(err) });
    return null;
  }
};

export const getActiveStudent = (): ActiveStudent | null => {
  try {
    const raw = safeGet(ACTIVE_STUDENT_KEY, 'getActiveStudent');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logSession('parse-failed', 'getActiveStudent', String(err));
    return null;
  }
};

/**
 * Save the student session. Only ONE role may stay signed in on a device at a
 * time, so any saved teacher session is removed — otherwise a student using a
 * shared classroom device could re-enter the teacher dashboard.
 */
export const setActiveStudent = (session: ActiveStudent) => {
  localStorage.setItem(ACTIVE_STUDENT_KEY, JSON.stringify(session));
  localStorage.setItem(ACTIVE_ROLE_KEY, 'student');
  localStorage.removeItem(ACTIVE_TEACHER_KEY);
  try {
    localStorage.setItem(LAST_CLASS_CODE_KEY, session.classCode);
  } catch {
    // ignore storage errors (e.g. private mode)
  }
  logSession('write', 'setActiveStudent', {
    classCode: session.classCode,
    nickname: session.nickname,
    solo: Boolean(session.solo),
  });
  window.dispatchEvent(new Event(SESSION_CHANGED));
};

export const getLastClassCode = (): string => {
  try {
    return safeGet(LAST_CLASS_CODE_KEY, 'getLastClassCode') ?? '';
  } catch {
    return '';
  }
};

export const clearActiveStudent = () => {
  localStorage.removeItem(ACTIVE_STUDENT_KEY);
  if (localStorage.getItem(ACTIVE_ROLE_KEY) === 'student') {
    localStorage.removeItem(ACTIVE_ROLE_KEY);
  }
  logSession('clear', 'explicit-sign-out-or-delete-student');
  window.dispatchEvent(new Event(SESSION_CHANGED));
};

export const getStudentDisplayName = (session: ActiveStudent | null): string => {
  if (!session) return '';
  return session.displayName || session.nickname;
};

export const getActiveTeacher = (): ActiveTeacher | null => {
  try {
    const raw = safeGet(ACTIVE_TEACHER_KEY, 'getActiveTeacher');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logSession('parse-failed', 'getActiveTeacher', String(err));
    return null;
  }
};

/**
 * Save the teacher session. Mirrors setActiveStudent: the most recent login is
 * the only one kept, so any saved student session is removed. The teacher PIN
 * is intentionally NOT written to device storage — it stays server-side and is
 * re-verified at login (App Store Guideline 1.6 / data-minimisation).
 */
export const setActiveTeacher = (session: ActiveTeacher) => {
  const { teacherCode: _omitted, ...persisted } = session;
  localStorage.setItem(ACTIVE_TEACHER_KEY, JSON.stringify(persisted));
  localStorage.setItem(ACTIVE_ROLE_KEY, 'teacher');
  localStorage.removeItem(ACTIVE_STUDENT_KEY);
  logSession('write', 'setActiveTeacher', { classCode: persisted.classCode });
  window.dispatchEvent(new Event(SESSION_CHANGED));
};

export const clearActiveTeacher = () => {
  localStorage.removeItem(ACTIVE_TEACHER_KEY);
  if (localStorage.getItem(ACTIVE_ROLE_KEY) === 'teacher') {
    localStorage.removeItem(ACTIVE_ROLE_KEY);
  }
  logSession('clear', 'explicit-sign-out-or-delete-teacher');
  window.dispatchEvent(new Event(SESSION_CHANGED));
};

/**
 * Shared classroom devices must never keep a student AND a teacher signed in.
 * If a leftover pair is found (from an older build), drop the teacher session
 * so a student cannot open the dashboard.
 */
export const reconcileExclusiveSession = () => {
  try {
    const student = localStorage.getItem(ACTIVE_STUDENT_KEY);
    const teacher = localStorage.getItem(ACTIVE_TEACHER_KEY);
    const role = localStorage.getItem(ACTIVE_ROLE_KEY);
    if (student && teacher) {
      if (role === 'teacher') {
        localStorage.removeItem(ACTIVE_STUDENT_KEY);
        logSession('reconcile', 'drop-student-keep-teacher');
      } else {
        localStorage.removeItem(ACTIVE_TEACHER_KEY);
        localStorage.setItem(ACTIVE_ROLE_KEY, 'student');
        logSession('reconcile', 'drop-teacher-keep-student');
      }
    }
  } catch (err) {
    logSession('reconcile-failed', 'reconcileExclusiveSession', String(err));
  }
};

/** Snapshot current session keys for native write-through. */
export const readSessionSnapshot = (): SessionSnapshot => ({
  student: safeGet(ACTIVE_STUDENT_KEY, 'snapshot'),
  teacher: safeGet(ACTIVE_TEACHER_KEY, 'snapshot'),
  role: safeGet(ACTIVE_ROLE_KEY, 'snapshot'),
  lastClassCode: safeGet(LAST_CLASS_CODE_KEY, 'snapshot'),
});

/**
 * Apply values restored from the native Keychain (or an equivalent bridge).
 *
 * CRITICAL: a missing/nil value does NOT clear localStorage. Only positive
 * restores write. Callers that intentionally clear must use clearActive*.
 */
export const applyRestoredSessionValues = (
  values: Partial<Record<SessionKey, string | null | undefined>>,
  reason: string
): boolean => {
  let wrote = false;
  try {
    const student = values[ACTIVE_STUDENT_KEY];
    const teacher = values[ACTIVE_TEACHER_KEY];
    let role = values[ACTIVE_ROLE_KEY];
    const lastClass = values[LAST_CLASS_CODE_KEY];

    // Exclusivity only when BOTH roles were positively restored.
    let nextStudent = typeof student === 'string' && student.length > 0 ? student : null;
    let nextTeacher = typeof teacher === 'string' && teacher.length > 0 ? teacher : null;
    if (nextStudent && nextTeacher) {
      if (role === 'teacher') nextStudent = null;
      else {
        nextTeacher = null;
        role = 'student';
      }
    }

    if (nextStudent) {
      localStorage.setItem(ACTIVE_STUDENT_KEY, nextStudent);
      wrote = true;
    }
    if (nextTeacher) {
      localStorage.setItem(ACTIVE_TEACHER_KEY, nextTeacher);
      wrote = true;
    }
    if (typeof role === 'string' && role.length > 0) {
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
      wrote = true;
    }
    if (typeof lastClass === 'string' && lastClass.length > 0) {
      localStorage.setItem(LAST_CLASS_CODE_KEY, lastClass);
      wrote = true;
    }

    // If both roles somehow remain in localStorage after a partial restore,
    // drop the inactive one — still never clear because a restore was nil.
    reconcileExclusiveSession();

    if (wrote) {
      logSession('restore', reason, {
        student: Boolean(nextStudent),
        teacher: Boolean(nextTeacher),
        role: role ?? null,
      });
      window.dispatchEvent(new Event(SESSION_CHANGED));
    } else {
      logSession('restore-skip', reason, 'no positive values');
    }
  } catch (err) {
    logSession('restore-failed', reason, String(err));
  }
  return wrote;
};

/** True when localStorage has neither student nor teacher session. */
export const hasNoLocalSession = (): boolean => {
  try {
    return !localStorage.getItem(ACTIVE_STUDENT_KEY) && !localStorage.getItem(ACTIVE_TEACHER_KEY);
  } catch {
    return true;
  }
};

export const SESSION_STORAGE_KEYS: readonly SessionKey[] = SESSION_KEYS;
