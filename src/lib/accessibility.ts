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
export type ColorTheme = 'light' | 'dark' | 'contrast' | 'system';
export type DisplayStyle = 'playful' | 'standard' | 'minimal';

export interface AccessibilityPrefs {
  textSize: TextSize;
  easyReadSpacing: boolean;
  highContrast: boolean;
  /**
   * Low-vision mode. When true, the app uses high-contrast colours and a
   * roomier landscape (extra-large type, bigger targets). When false, those
   * overrides are never applied — even if colorTheme was previously "contrast".
   */
  lowVision: boolean;
  /** Light, dark, high contrast, or follow the OS. High contrast replaces the old toggle. */
  colorTheme: ColorTheme;
  dyslexiaFont: boolean;
  displayStyle: DisplayStyle;
  /** Optional path theme id. Empty means no extra planet colors. */
  planetTheme: string;
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
  /**
   * OpenAI gpt-4o-mini-tts voice id. MathLift always uses Alloy when cloud TTS
   * is available; other values are normalized away on load.
   */
  cloudVoice: string;
  /** Slow or normal speaking pace for kids. */
  speechRate: SpeechRatePref;
  /**
   * Warm on-device Kokoro / OS neural fallback for English.
   * Default OFF — cloud OpenAI Alloy is preferred when configured.
   */
  naturalVoice: boolean;
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
  lowVision: false,
  /** Classic MathLift blue space look (not OS light / cream). */
  colorTheme: 'dark',
  dyslexiaFont: false,
  displayStyle: 'playful',
  planetTheme: '',
  colorSafeLabels: true,
  reduceMotion: false,
  calmBackground: false,
  focusMode: false,
  autoReadAloud: false,
  soundAsText: true,
  muteSounds: false,
  voiceEnabled: true,
  voiceURI: null,
  cloudVoice: 'alloy',
  speechRate: 'normal',
  naturalVoice: false,
  biggerButtons: false,
  answerMethod: 'any',
  pacing: 'normal',
  numberStyle: 'western',
  breaks: false,
  summaryFirst: false,
  workedExampleFirst: false,
};

const STORAGE_KEY = 'mathlift.learningPrefs.v1';
/** One-shot: old default was "system" (cream on light OS) → restore classic dark blue. */
const BLUE_THEME_MIGRATE_KEY = 'mathlift.restoredBlueTheme.v1';

export const resolveColorTheme = (
  prefs: Pick<AccessibilityPrefs, 'colorTheme' | 'lowVision'>
): 'light' | 'dark' | 'contrast' => {
  // High-contrast colours are reserved for low-vision mode.
  if (prefs.lowVision) return 'contrast';
  if (prefs.colorTheme === 'light' || prefs.colorTheme === 'dark') {
    return prefs.colorTheme;
  }
  // Explicit "system" follows the OS; anything else (incl. ungated contrast) → classic dark blue.
  if (prefs.colorTheme === 'system') {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    ) {
      return 'light';
    }
  }
  return 'dark';
};

/**
 * Turn low-vision mode on or off.
 * On → contrast colours + roomier landscape.
 * Off → always clears the low-vision flags so the normal theme/size can apply again.
 */
export const withLowVision = (prefs: AccessibilityPrefs, enabled: boolean): AccessibilityPrefs => {
  if (!enabled) {
    return {
      ...prefs,
      lowVision: false,
      highContrast: false,
      // Leave contrast for the classic blue dark theme (Light/System remain opt-in).
      colorTheme: prefs.colorTheme === 'contrast' ? 'dark' : prefs.colorTheme,
      textSize: prefs.textSize === 'xlarge' ? 'normal' : prefs.textSize,
      biggerButtons: false,
    };
  }
  return {
    ...prefs,
    lowVision: true,
    highContrast: true,
    colorTheme: 'contrast',
    textSize: 'xlarge',
    biggerButtons: true,
    colorSafeLabels: true,
    autoReadAloud: true,
  };
};

/** Pick a normal (non-contrast) theme and guarantee low-vision overrides are cleared. */
export const withColorTheme = (prefs: AccessibilityPrefs, theme: ColorTheme): AccessibilityPrefs => {
  if (theme === 'contrast') return withLowVision(prefs, true);
  return {
    ...withLowVision(prefs, false),
    colorTheme: theme,
    highContrast: false,
    lowVision: false,
  };
};

export const loadPrefs = (): AccessibilityPrefs => {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AccessibilityPrefs> & { voiceEnabled?: boolean };
    const merged: AccessibilityPrefs = { ...DEFAULT_PREFS, ...parsed };
    if (!('colorTheme' in parsed)) {
      // Pre-theme installs used the blue :root palette — restore that, not OS cream.
      merged.colorTheme = parsed.highContrast ? 'contrast' : 'dark';
    }
    if (!('reduceMotion' in parsed) && typeof window.matchMedia === 'function') {
      merged.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    if (
      merged.colorTheme !== 'light' &&
      merged.colorTheme !== 'dark' &&
      merged.colorTheme !== 'contrast' &&
      merged.colorTheme !== 'system'
    ) {
      merged.colorTheme = 'dark';
    }
    // One-shot: stored "system" from the old product default → classic dark blue.
    // Persist the migration so the next load does not leave cream "system" in storage.
    // After this runs once, Appearance → System can stick again.
    let migratedSystemToDark = false;
    try {
      if (
        merged.colorTheme === 'system' &&
        window.localStorage.getItem(BLUE_THEME_MIGRATE_KEY) !== '1'
      ) {
        merged.colorTheme = 'dark';
        migratedSystemToDark = true;
        window.localStorage.setItem(BLUE_THEME_MIGRATE_KEY, '1');
      } else if (window.localStorage.getItem(BLUE_THEME_MIGRATE_KEY) !== '1') {
        window.localStorage.setItem(BLUE_THEME_MIGRATE_KEY, '1');
      }
    } catch {
      /* storage blocked */
    }
    if (
      merged.displayStyle !== 'playful' &&
      merged.displayStyle !== 'standard' &&
      merged.displayStyle !== 'minimal'
    ) {
      merged.displayStyle = 'playful';
    }
    if (typeof merged.planetTheme !== 'string') merged.planetTheme = '';
    // Migrate older contrast/highContrast choices into the lowVision gate.
    if (!('lowVision' in parsed)) {
      merged.lowVision = merged.colorTheme === 'contrast' || !!parsed.highContrast;
    } else {
      merged.lowVision = !!parsed.lowVision;
    }
    if (merged.lowVision) {
      merged.colorTheme = 'contrast';
      merged.highContrast = true;
    } else {
      merged.highContrast = false;
      if (merged.colorTheme === 'contrast') merged.colorTheme = 'dark';
    }

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
    // Always Alloy for cloud TTS — discard coral/sage/etc. from older sessions.
    merged.cloudVoice = 'alloy';
    // Always keep Natural voice (Kokoro) off for users; OpenAI Alloy is the path.
    merged.naturalVoice = false;
    // Default selection in Settings is OpenAI Alloy (shown when voiceURI is null).
    merged.voiceURI = null;
    if (migratedSystemToDark) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* storage blocked */
      }
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

/**
 * Calm mode: plain background + less motion + muted SFX.
 * Turning Calm on bundles reduceMotion and muteSounds; turning it off only clears the calm flag.
 */
export const withCalmMode = (
  prefs: AccessibilityPrefs,
  enabled: boolean
): AccessibilityPrefs => {
  if (!enabled) return { ...prefs, calmBackground: false };
  return {
    ...prefs,
    calmBackground: true,
    reduceMotion: true,
    muteSounds: true,
  };
};

/** mirror the preferences onto <html> so plain CSS can react to them */
export const applyPrefsToDocument = (prefs: AccessibilityPrefs) => {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  const lowVision = !!prefs.lowVision;
  // Landscape (type size + hit targets) enlarges only while low vision is on.
  el.setAttribute('data-text-size', lowVision ? 'xlarge' : prefs.textSize);
  el.toggleAttribute('data-easy-read', prefs.easyReadSpacing);
  const theme = resolveColorTheme(prefs);
  el.setAttribute('data-theme', theme);
  el.toggleAttribute('data-high-contrast', lowVision && theme === 'contrast');
  el.toggleAttribute('data-low-vision', lowVision);
  el.toggleAttribute('data-dyslexia-font', prefs.dyslexiaFont);
  el.setAttribute('data-display', prefs.displayStyle);
  if (prefs.planetTheme) el.setAttribute('data-planet-theme', prefs.planetTheme);
  else el.removeAttribute('data-planet-theme');
  const reduceMotion = prefs.reduceMotion || prefs.calmBackground;
  el.setAttribute('data-motion', reduceMotion ? 'reduce' : 'allow');
  el.toggleAttribute('data-calm', prefs.calmBackground);
  el.toggleAttribute('data-focus-mode', prefs.focusMode);
  el.toggleAttribute('data-reduce-motion', reduceMotion);
  el.toggleAttribute('data-big-targets', lowVision ? true : prefs.biggerButtons);
  el.toggleAttribute('data-relaxed-pacing', prefs.pacing === 'relaxed');
  el.toggleAttribute('data-voice-off', !prefs.voiceEnabled);
};
