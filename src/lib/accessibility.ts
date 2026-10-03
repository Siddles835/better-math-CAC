/**
 * Learning preferences (accessibility) 
 * These options only change HOW a lesson is shown, heard, and answered 
 * never the maths content or the objective, and they are available to
 * every student
 */

export type TextSize = 'normal' | 'large' | 'xlarge';
export type AnswerMethod = 'any' | 'type' | 'choose' | 'draw';
export type Pacing = 'normal' | 'relaxed';

export interface AccessibilityPrefs {
  textSize: TextSize;
  easyReadSpacing: boolean;
  highContrast: boolean;
  colorSafeLabels: boolean;
  reduceMotion: boolean;
  calmBackground: boolean;
  focusMode: boolean;
  autoReadAloud: boolean;
  soundAsText: boolean;
  muteSounds: boolean;
  biggerButtons: boolean;
  answerMethod: AnswerMethod;
  pacing: Pacing;
  breaks: boolean;
  summaryFirst: boolean;
  workedExampleFirst: boolean;
}

export const DEFAULT_PREFS: AccessibilityPrefs = {
  textSize: 'normal',
  easyReadSpacing: false,
  highContrast: false,
  colorSafeLabels: true,
  reduceMotion: false,
  calmBackground: false,
  focusMode: false,
  autoReadAloud: false,
  soundAsText: true,
  muteSounds: false,
  biggerButtons: false,
  answerMethod: 'any',
  pacing: 'normal',
  breaks: false,
  summaryFirst: false,
  workedExampleFirst: false,
};

const STORAGE_KEY = 'mathlift.learningPrefs.v1';

export const loadPrefs = (): AccessibilityPrefs => {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AccessibilityPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
};

export const savePrefs = (prefs: AccessibilityPrefs) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage blocked: preferences still apply this session */
  }
};

/** mirror the preferences onto <html> so plain CSS can react to them */
export const applyPrefsToDocument = (prefs: AccessibilityPrefs) => {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.setAttribute('data-text-size', prefs.textSize);
  el.toggleAttribute('data-easy-read', prefs.easyReadSpacing);
  el.toggleAttribute('data-high-contrast', prefs.highContrast);
  el.toggleAttribute('data-calm', prefs.calmBackground);
  el.toggleAttribute('data-focus-mode', prefs.focusMode);
  el.toggleAttribute('data-reduce-motion', prefs.reduceMotion);
  el.toggleAttribute('data-big-targets', prefs.biggerButtons);
  el.toggleAttribute('data-relaxed-pacing', prefs.pacing === 'relaxed');
};
