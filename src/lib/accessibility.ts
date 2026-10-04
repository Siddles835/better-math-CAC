/**
 * Learning preferences (accessibility)
 * These options only change HOW a lesson is shown, heard, and answered
 * never the maths content or the objective, and they are available to
 * every student
 */

export type TextSize = 'normal' | 'large' | 'xlarge';
export type AnswerMethod = 'any' | 'type' | 'choose' | 'draw';
export type Pacing = 'normal' | 'relaxed';
export type NumberStyle = 'western' | 'eastern' | 'devanagari';
export type SpeechRatePref = 'slow' | 'normal';

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
  /** Mute tap / celebration sound effects — distinct from speaking voice. */
  muteSounds: boolean;
  /**
   * Speaking voice on/off (default ON). Separate from muteSounds (SFX).
   * When false, TTS stops immediately and read-aloud stays hidden.
   */
  voiceEnabled: boolean;
  /** Device-only preferred SpeechSynthesis voiceURI for the current language. */
  voiceURI: string | null;
  /** Slow or normal speaking pace for kids. */
  speechRate: SpeechRatePref;
  biggerButtons: boolean;
  answerMethod: AnswerMethod;
  pacing: Pacing;
  numberStyle: NumberStyle;
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
  voiceEnabled: true,
  voiceURI: null,
  speechRate: 'normal',
  biggerButtons: false,
  answerMethod: 'any',
  pacing: 'normal',
  numberStyle: 'western',
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
    const parsed = JSON.parse(raw) as Partial<AccessibilityPrefs> & { voiceEnabled?: boolean };
    const merged: AccessibilityPrefs = { ...DEFAULT_PREFS, ...parsed };

    // PR #2 reused muteSounds as the voice toggle. Migrate once to voiceEnabled.
    if (!('voiceEnabled' in parsed)) {
      merged.voiceEnabled = !parsed.muteSounds;
      merged.muteSounds = false;
    }

    if (merged.speechRate !== 'slow' && merged.speechRate !== 'normal') {
      merged.speechRate = 'normal';
    }
    if (merged.voiceURI != null && typeof merged.voiceURI !== 'string') {
      merged.voiceURI = null;
    }
    return merged;
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
  el.toggleAttribute('data-voice-off', !prefs.voiceEnabled);
};
