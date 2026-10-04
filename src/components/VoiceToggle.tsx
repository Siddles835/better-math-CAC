import { tx } from '@/i18n/tx';
import React from 'react';
import { Volume2, VolumeX, Check } from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useTranslation } from 'react-i18next';

interface VoiceToggleProps {
  className?: string;
  /** Compact layout without the section heading (for embedding in another panel). */
  embedded?: boolean;
}

/**
 * Persistent speaking-voice on/off control.
 * Stores as inverted `muteSounds` in learning prefs so existing sessions keep working.
 */
const VoiceToggle: React.FC<VoiceToggleProps> = ({ className = '', embedded = false }) => {
  const { t } = useTranslation(['settings']);
  const { prefs, setPref, announce } = useAccessibility();
  const voiceOn = !prefs.muteSounds;

  const toggle = () => {
    const nextOn = !voiceOn;
    setPref('muteSounds', !nextOn);
    announce(`${t('settings:voiceToggle')} ${nextOn ? tx('ui:switchOn') : tx('ui:switchOff')}`);
  };

  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={voiceOn}
      aria-label={t('settings:voiceToggle')}
      onClick={toggle}
      className="w-full text-start flex items-start gap-3 rounded-2xl border border-border bg-card p-4 min-h-[56px] hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span
        aria-hidden
        className="mt-0.5 inline-flex w-10 h-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary"
      >
        {voiceOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </span>
      <span className="flex-1">
        <span className="font-medium flex items-center gap-2">
          {t('settings:voiceToggle')}
          {voiceOn ? (
            <span className="inline-flex items-center text-primary" aria-hidden>
              <Check className="w-4 h-4" />
            </span>
          ) : null}
        </span>
        <span className="block text-sm text-muted-foreground">{t('settings:voiceToggleHint')}</span>
      </span>
      <span className="text-sm font-semibold">
        {voiceOn ? tx('ui:switchOn') : tx('ui:switchOff')}
      </span>
    </button>
  );

  if (embedded) {
    return <div className={className}>{control}</div>;
  }

  return (
    <section className={`rounded-2xl border border-border bg-card/90 p-5 ${className}`}>
      <h2 className="text-lg font-semibold mb-1">{t('settings:voiceTitle')}</h2>
      <p className="text-sm text-muted-foreground mb-4">{t('settings:voiceHelp')}</p>
      {control}
    </section>
  );
};

export default VoiceToggle;
