import type { ObjectPrefs } from '@/lib/objects/types';

const KEY = 'mathlift:object-prefs.v1';

export const DEFAULT_OBJECT_PREFS: ObjectPrefs = {
  activeId: null,
  showPicturesWithProblems: true,
  grownUpUnlocked: false,
};

export const loadObjectPrefs = (): ObjectPrefs => {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_OBJECT_PREFS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_OBJECT_PREFS };
    const parsed = JSON.parse(raw) as Partial<ObjectPrefs>;
    return {
      activeId: parsed.activeId ?? null,
      showPicturesWithProblems: parsed.showPicturesWithProblems !== false,
      grownUpUnlocked: !!parsed.grownUpUnlocked,
    };
  } catch {
    return { ...DEFAULT_OBJECT_PREFS };
  }
};

export const saveObjectPrefs = (prefs: ObjectPrefs): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* quota or private mode */
  }
};

export const patchObjectPrefs = (patch: Partial<ObjectPrefs>): ObjectPrefs => {
  const next = { ...loadObjectPrefs(), ...patch };
  saveObjectPrefs(next);
  return next;
};
