import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import { isAppLang } from '@/lib/cognition/readingTime';
import {
  getVoices,
  listVoicesForLang,
  sampleSpeechText,
  speak,
  stopSpeaking,
  voiceQuality,
} from '@/lib/speech';

/**
 * Device-only voice picker + speed control for the current language.
 * Quality depends on voices installed on the device (no cloud TTS at runtime).
 */
const VoiceSettings: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t, i18n } = useTranslation(['settings']);
  const { prefs, setPref, announce } = useAccessibility();
  const lang = isAppLang(i18n.language) ? i18n.language : 'en';
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const refresh = () => setVoices(getVoices());
    refresh();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, [lang]);

  const ranked = useMemo(() => listVoicesForLang(lang, voices), [lang, voices]);
  const best = ranked[0] ?? null;
  const onlyLowQuality = ranked.length > 0 && ranked.every((voice) => voiceQuality(voice) === 'standard');

  const playSample = (voiceURI: string | null) => {
    if (!prefs.voiceEnabled) {
      announce(t('settings:voiceOff'));
      return;
    }
    stopSpeaking();
    speak(sampleSpeechText(lang), {
      lang,
      voiceURI,
      ratePref: prefs.speechRate,
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="mb-1 text-base font-semibold">{t('settings:voiceSpeed')}</h3>
        <p className="mb-3 text-sm text-muted-foreground">{t('settings:voiceSpeedHelp')}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('settings:voiceSpeed')}>
          {(['slow', 'normal'] as const).map((rate) => (
            <Button
              key={rate}
              type="button"
              variant={prefs.speechRate === rate ? 'default' : 'outline'}
              className="min-h-[48px]"
              aria-pressed={prefs.speechRate === rate}
              onClick={() => {
                setPref('speechRate', rate);
                announce(`${t('settings:voiceSpeed')} ${t(`settings:voiceSpeed_${rate}`)}`);
              }}
            >
              {prefs.speechRate === rate ? <Check className="me-2 h-4 w-4" aria-hidden /> : null}
              {t(`settings:voiceSpeed_${rate}`)}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-base font-semibold">{t('settings:voicePicker')}</h3>
        <p className="mb-3 text-sm text-muted-foreground">{t('settings:voicePickerHelp')}</p>
        {best && (
          <p className="mb-3 text-sm">
            <span className="font-medium">{t('settings:voiceBestFound')}: </span>
            <span>{best.name}</span>
          </p>
        )}
        {onlyLowQuality && (
          <p className="mb-3 text-sm text-muted-foreground">{t('settings:voiceLowQualityTip')}</p>
        )}
        {ranked.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings:voiceNone')}</p>
        ) : (
          <ul className="space-y-2">
            <li>
              <button
                type="button"
                aria-pressed={!prefs.voiceURI}
                onClick={() => {
                  setPref('voiceURI', null);
                  announce(t('settings:voiceAuto'));
                }}
                className="flex min-h-[56px] w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-start hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex-1">
                  <span className="font-medium">{t('settings:voiceAuto')}</span>
                  <span className="block text-sm text-muted-foreground">{t('settings:voiceAutoHint')}</span>
                </span>
                {!prefs.voiceURI ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
              </button>
            </li>
            {ranked.map((voice) => {
              const selected = prefs.voiceURI === voice.voiceURI;
              const quality = voiceQuality(voice);
              return (
                <li key={voice.voiceURI}>
                  <div className="flex items-stretch gap-2">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setPref('voiceURI', voice.voiceURI);
                        announce(voice.name);
                      }}
                      className="flex min-h-[56px] flex-1 items-start gap-3 rounded-2xl border border-border bg-card p-4 text-start hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="flex-1">
                        <span className="font-medium">{voice.name}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span>{voice.lang}</span>
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                            {quality === 'natural'
                              ? t('settings:voiceQualityNatural')
                              : t('settings:voiceQualityStandard')}
                          </span>
                        </span>
                      </span>
                      {selected ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[56px] shrink-0"
                      onClick={() => playSample(voice.voiceURI)}
                    >
                      {t('settings:voiceSample')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[48px]"
            disabled={!prefs.voiceEnabled}
            onClick={() => playSample(prefs.voiceURI)}
          >
            {t('settings:voiceSample')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettings;
