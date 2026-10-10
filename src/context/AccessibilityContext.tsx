import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  AccessibilityPrefs, DEFAULT_PREFS, applyPrefsToDocument, loadPrefs, savePrefs,
} from '@/lib/accessibility';
import {
  setPreferredVoiceURI,
  setSpeechMuted,
  setSpeechRatePref,
  stopSpeaking,
} from '@/lib/speech';

interface AccessibilityValue {
  prefs: AccessibilityPrefs;
  setPref: <K extends keyof AccessibilityPrefs>(key: K, value: AccessibilityPrefs[K]) => void;
  resetPrefs: () => void;
  announce: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityValue>({
  prefs: DEFAULT_PREFS,
  setPref: () => undefined,
  resetPrefs: () => undefined,
  announce: () => undefined,
});

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(() => loadPrefs());
  const [message, setMessage] = useState('');

  useEffect(() => {
    applyPrefsToDocument(prefs);
    // Voice off mutes TTS; muteSounds is SFX-only and does not stop speech.
    setSpeechMuted(!prefs.voiceEnabled);
    setPreferredVoiceURI(prefs.voiceURI);
    setSpeechRatePref(prefs.speechRate);
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
      setPrefs((prev) => ({ ...prev, [key]: value }));
    }, []);

  const resetPrefs = useCallback(() => setPrefs(DEFAULT_PREFS), []);
  const announce = useCallback((next: string) => {
    // Clear first so the same message is read out again if repeated
    setMessage('');
    window.setTimeout(() => setMessage(next), 50);
  }, []);

  const value = useMemo(
    () => ({ prefs, setPref, resetPrefs, announce }),
    [prefs, setPref, resetPrefs, announce]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Any spoken thing or sound only things' status is always available as text for better accessibility */}
      <div aria-live="polite" role="status" className="sr-only">
        {message}
      </div>
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => useContext(AccessibilityContext);
export default AccessibilityContext;
