import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  AccessibilityPrefs, DEFAULT_PREFS, applyPrefsToDocument, loadPrefs, savePrefs,
  withCalmMode, withColorTheme, withLowVision,
} from '@/lib/accessibility';
import {
  prefetchSpeechManifest,
  setNaturalVoicePref,
  setPreferredVoiceURI,
  setSpeechMuted,
  setSpeechRatePref,
  stopSpeaking,
} from '@/lib/speech';

/** Visible sound-as-text captions clear so they never cover Back forever. */
export const ANNOUNCE_VISIBLE_MS = 2500;

interface AccessibilityValue {
  prefs: AccessibilityPrefs;
  setPref: <K extends keyof AccessibilityPrefs>(key: K, value: AccessibilityPrefs[K]) => void;
  /** Merge several prefs at once without locking. Calm mode still bundles when calmBackground is set. */
  patchPrefs: (patch: Partial<AccessibilityPrefs>) => void;
  /** Replace the full preference object (used when turning accommodation needs off). */
  replacePrefs: (next: AccessibilityPrefs) => void;
  resetPrefs: () => void;
  announce: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityValue>({
  prefs: DEFAULT_PREFS,
  setPref: () => undefined,
  patchPrefs: () => undefined,
  replacePrefs: () => undefined,
  resetPrefs: () => undefined,
  announce: () => undefined,
});

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(() => loadPrefs());
  const [message, setMessage] = useState('');
  const clearTimer = useRef<number | null>(null);
  const showTimer = useRef<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    prefetchSpeechManifest();
  }, []);

  useEffect(() => {
    applyPrefsToDocument(prefs);
    // Voice off mutes TTS; muteSounds is SFX-only and does not stop speech.
    setSpeechMuted(!prefs.voiceEnabled);
    setPreferredVoiceURI(prefs.voiceURI);
    setSpeechRatePref(prefs.speechRate);
    setNaturalVoicePref(!!prefs.naturalVoice);
    if (!prefs.voiceEnabled) stopSpeaking();
    savePrefs(prefs);
    if (prefs.colorTheme !== 'system' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyPrefsToDocument(prefs);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, [prefs]);

  const clearAnnounce = useCallback(() => {
    if (showTimer.current) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (clearTimer.current) {
      window.clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
    setMessage('');
  }, []);

  // Leaving a lesson (or any route) must drop the caption so it cannot cover Back on other pages.
  useEffect(() => {
    clearAnnounce();
  }, [clearAnnounce, location.pathname]);

  useEffect(
    () => () => {
      if (showTimer.current) window.clearTimeout(showTimer.current);
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
    },
    []
  );

  const setPref = useCallback(
    <K extends keyof AccessibilityPrefs>(key: K, value: AccessibilityPrefs[K]) => {
      setPrefs((prev) => {
        if (key === 'calmBackground') {
          return withCalmMode(prev, Boolean(value));
        }
        if (key === 'lowVision') {
          return withLowVision(prev, Boolean(value));
        }
        if (key === 'colorTheme') {
          return withColorTheme(prev, value as AccessibilityPrefs['colorTheme']);
        }
        // Changing text size or button size away from the low-vision landscape unlocks it.
        if (key === 'textSize' && prev.lowVision && value !== 'xlarge') {
          return { ...withLowVision(prev, false), textSize: value as AccessibilityPrefs['textSize'] };
        }
        if (key === 'biggerButtons' && prev.lowVision && value === false) {
          return { ...withLowVision(prev, false), biggerButtons: false };
        }
        return { ...prev, [key]: value };
      });
    },
    []
  );

  const patchPrefs = useCallback((patch: Partial<AccessibilityPrefs>) => {
    setPrefs((prev) => {
      // Explicit low-vision / theme helpers win so turning the mode OFF always sticks.
      if ('lowVision' in patch) {
        const base = withLowVision(prev, Boolean(patch.lowVision));
        const { lowVision: _lv, highContrast: _hc, colorTheme: themeFromPatch, ...rest } = patch;
        void _lv;
        void _hc;
        let next = { ...base, ...rest, lowVision: base.lowVision, highContrast: base.highContrast };
        if (themeFromPatch && themeFromPatch !== 'contrast') {
          next = withColorTheme(next, themeFromPatch);
        }
        if ('calmBackground' in patch) {
          next = { ...withCalmMode(next, Boolean(patch.calmBackground)), ...rest, lowVision: next.lowVision };
          next.calmBackground = Boolean(patch.calmBackground);
        }
        return next;
      }
      if (patch.colorTheme) {
        let next = withColorTheme(prev, patch.colorTheme);
        const { colorTheme: _ct, lowVision: _lv, highContrast: _hc, ...rest } = patch;
        void _ct;
        void _lv;
        void _hc;
        next = { ...next, ...rest, lowVision: next.lowVision, highContrast: next.highContrast, colorTheme: next.colorTheme };
        if ('calmBackground' in patch) {
          next = withCalmMode(next, Boolean(patch.calmBackground));
          next.calmBackground = Boolean(patch.calmBackground);
        }
        return next;
      }
      let next = { ...prev, ...patch };
      if ('calmBackground' in patch) {
        const withCalm = withCalmMode(prev, Boolean(patch.calmBackground));
        next = { ...withCalm, ...patch, calmBackground: Boolean(patch.calmBackground) };
      }
      return next;
    });
  }, []);

  const replacePrefs = useCallback((next: AccessibilityPrefs) => {
    setPrefs(next);
  }, []);

  const resetPrefs = useCallback(() => setPrefs(DEFAULT_PREFS), []);
  const announce = useCallback((next: string) => {
    // Clear first so the same message is read out again if repeated
    if (showTimer.current) window.clearTimeout(showTimer.current);
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    setMessage('');
    showTimer.current = window.setTimeout(() => {
      setMessage(next);
      clearTimer.current = window.setTimeout(() => {
        setMessage('');
        clearTimer.current = null;
      }, ANNOUNCE_VISIBLE_MS);
      showTimer.current = null;
    }, 50);
  }, []);

  const value = useMemo(
    () => ({ prefs, setPref, patchPrefs, replacePrefs, resetPrefs, announce }),
    [prefs, setPref, patchPrefs, replacePrefs, resetPrefs, announce]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Screen-reader live region; brief visible caption when soundAsText is on */}
      <div
        aria-live="polite"
        role="status"
        data-testid="a11y-announce"
        className={
          prefs.soundAsText && message
            ? // Sit above lesson Back/Next (footer ~4.5rem) and ignore pointer so nav stays clickable.
              'pointer-events-none fixed bottom-24 inset-inline-start-3 inset-inline-end-3 z-[60] mx-auto max-w-lg rounded-xl border border-border bg-card/95 px-4 py-2 text-center text-sm text-foreground shadow-md'
            : 'sr-only'
        }
      >
        {message}
      </div>
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => useContext(AccessibilityContext);
export default AccessibilityContext;
