export const ACTIVE_STUDENT_KEY = 'better-math:active';
export const ACTIVE_TEACHER_KEY = 'better-math:active-teacher';
export const LAST_CLASS_CODE_KEY = 'better-math:last-class-code';
/** Only one role stays signed in on a shared classroom device. */
export const ACTIVE_ROLE_KEY = 'better-math:active-role';
export const SESSION_CHANGED = 'better-math:session-changed';

export interface ActiveStudent {
  classCode: string;
  /** Firestore students map key */
  nickname: string;
  /** Optional display label (falls back to nickname) */
  displayName?: string;
}

export interface ActiveTeacher {
  classCode: string;
  teacherCode?: string;
}

export const getActiveStudent = (): ActiveStudent | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_STUDENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
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
  window.dispatchEvent(new Event(SESSION_CHANGED));
};

export const getLastClassCode = (): string => {
  try {
    return localStorage.getItem(LAST_CLASS_CODE_KEY) ?? '';
  } catch {
    return '';
  }
};

export const clearActiveStudent = () => {
  localStorage.removeItem(ACTIVE_STUDENT_KEY);
  if (localStorage.getItem(ACTIVE_ROLE_KEY) === 'student') {
    localStorage.removeItem(ACTIVE_ROLE_KEY);
  }
  window.dispatchEvent(new Event(SESSION_CHANGED));
};

export const getStudentDisplayName = (session: ActiveStudent | null): string => {
  if (!session) return '';
  return session.displayName || session.nickname;
};

export const getActiveTeacher = (): ActiveTeacher | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_TEACHER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
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
  window.dispatchEvent(new Event(SESSION_CHANGED));
};

export const clearActiveTeacher = () => {
  localStorage.removeItem(ACTIVE_TEACHER_KEY);
  if (localStorage.getItem(ACTIVE_ROLE_KEY) === 'teacher') {
    localStorage.removeItem(ACTIVE_ROLE_KEY);
  }
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
      } else {
        localStorage.removeItem(ACTIVE_TEACHER_KEY);
        localStorage.setItem(ACTIVE_ROLE_KEY, 'student');
      }
    }
  } catch {
    // ignore storage errors
  }
};
