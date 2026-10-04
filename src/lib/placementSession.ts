/** SessionStorage helpers for in-flight placement (solo pending lives in solo.ts). */

export const CLASS_PLACEMENT_PENDING_KEY = 'better-math:class-placement-pending';

export interface ClassPlacementPending {
  classCode: string;
  nickname: string;
  displayName: string;
}

export const saveClassPlacementPending = (pending: ClassPlacementPending): void => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(CLASS_PLACEMENT_PENDING_KEY, JSON.stringify(pending));
};

export const loadClassPlacementPending = (): ClassPlacementPending | null => {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CLASS_PLACEMENT_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClassPlacementPending;
    if (!parsed?.classCode || !parsed?.nickname) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearClassPlacementPending = (): void => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(CLASS_PLACEMENT_PENDING_KEY);
};
