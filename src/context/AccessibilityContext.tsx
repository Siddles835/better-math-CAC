import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  AccessibilityPrefs, DEFAULT_PREFS, applyPrefsToDocument, loadPrefs, savePrefs,
  withCalmMode,
} from '@/lib/accessibility';
import {
  prefetchSpeechManifest,
  setNaturalVoicePref,
  setPreferredVoiceURI,
  setSpeechMuted,
  setSpeechRatePref,
  stopSpeaking,
} from '@/lib/speech';

interface AccessibilityValue {
  prefs: AccessibilityPrefs;
  setPref: <K extends keyof AccessibilityPrefs>(key: K, value: AccessibilityPrefs[K]) => void;
  /** Merge several prefs at once without locking. Calm mode still bundles when calmBackground is set. */
  patchPrefs: (patch: Partial<AccessibilityPrefs>) => void;
  resetPrefs: () => void;
  announce: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityValue>({
  prefs: DEFAULT_PREFS,
  setPref: () => undefined,
  patchPrefs: () => undefined,
  resetPrefs: () => undefined,
  announce: () => undefined,
});

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(() => loadPrefs());
  const [message, setMessage] = useState('');

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

  const setPref = useCallback(
    <K extends keyof AccessibilityPrefs>(key: K, value: AccessibilityPrefs[K]) => {
      setPrefs((prev) => {
        if (key === 'calmBackground') {
          return withCalmMode(prev, Boolean(value));
        }
        return { ...prev, [key]: value };
      });
    }, []);

  const patchPrefs = useCallback((patch: Partial<AccessibilityPrefs>) => {
    setPrefs((prev) => {
      if ('calmBackground' in patch) {
        const withCalm = withCalmMode(prev, Boolean(patch.calmBackground));
        return { ...withCalm, ...patch, calmBackground: Boolean(patch.calmBackground) };
      }
      return { ...prev, ...patch };
    });
  }, []);

  const resetPrefs = useCallback(() => setPrefs(DEFAULT_PREFS), []);
  const announce = useCallback((next: string) => {
    // Clear first so the same message is read out again if repeated
    setMessage('');
    window.setTimeout(() => setMessage(next), 50);
  }, []);

  const value = useMemo(
    () => ({ prefs, setPref, patchPrefs, resetPrefs, announce }),
    [prefs, setPref, patchPrefs, resetPrefs, announce]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Screen-reader live region; visible caption when soundAsText is on */}
      <div
        aria-live="polite"
        role="status"
        data-testid="a11y-announce"
        className={
          prefs.soundAsText && message
            ? 'fixed bottom-3 inset-inline-start-3 inset-inline-end-3 z-[60] mx-auto max-w-lg rounded-xl border border-border bg-card px-4 py-2 text-center text-sm text-foreground shadow-md'
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
