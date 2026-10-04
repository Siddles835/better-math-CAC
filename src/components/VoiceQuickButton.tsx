import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '@/context/AccessibilityContext';
import { tx } from '@/i18n/tx';
import { stopSpeaking } from '@/lib/speech';

/**
 * One-tap voice on/off near read-aloud. Persists via voiceEnabled (not SFX mute).
 */
const VoiceQuickButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation(['settings']);
  const { prefs, setPref, announce } = useAccessibility();
  const voiceOn = prefs.voiceEnabled;

  const toggle = () => {
    const nextOn = !voiceOn;
    setPref('voiceEnabled', nextOn);
    if (!nextOn) stopSpeaking();
    announce(`${t('settings:voiceToggle')} ${nextOn ? tx('ui:switchOn') : tx('ui:switchOff')}`);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={voiceOn}
      aria-label={t('settings:voiceToggle')}
      title={voiceOn ? t('settings:voiceOn') : t('settings:voiceOff')}
      onClick={toggle}
      className={`inline-flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-border bg-card text-primary shadow-sm hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        voiceOn ? '' : 'opacity-70'
      } ${className}`}
    >
      {voiceOn ? <Volume2 className="w-6 h-6" aria-hidden /> : <VolumeX className="w-6 h-6" aria-hidden />}
    </button>
  );
};

export default VoiceQuickButton;
