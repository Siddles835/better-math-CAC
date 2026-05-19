export const ACTIVE_STUDENT_KEY = 'better-math:active';
export const SESSION_CHANGED = 'better-math:session-changed';

export interface ActiveStudent {
  classCode: string;
  nickname: string;
}

export const getActiveStudent = (): ActiveStudent | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_STUDENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setActiveStudent = (session: ActiveStudent) => {
  localStorage.setItem(ACTIVE_STUDENT_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_CHANGED));
};
