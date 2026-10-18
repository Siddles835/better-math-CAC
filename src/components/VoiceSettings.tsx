import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import { getNeuralStatus, onNeuralStatus, type NeuralStatus } from '@/lib/speechNeural';
import {
  ensureCloudTtsAvailable,
  getCloudTtsStatus,
  onCloudTtsStatus,
  type CloudTtsStatus,
} from '@/lib/speechOpenAI';

/**
 * Voice picker + clear natural voice toggle.
 * Prefers OpenAI gpt-4o-mini-tts when /api/tts is configured, then on-device Kokoro,
 * then the device voice. Cloud audio is AI-generated — disclosed in the UI.
 */
const VoiceSettings: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t, i18n } = useTranslation(['settings']);
  const { prefs, setPref, announce } = useAccessibility();
  const lang = isAppLang(i18n.language) ? i18n.language : 'en';
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [neuralStatus, setNeuralStatus] = useState<NeuralStatus>(() => getNeuralStatus());
  const [cloudStatus, setCloudStatus] = useState<CloudTtsStatus>(() => getCloudTtsStatus());

  useEffect(() => {
    const refresh = () => setVoices(getVoices());
    refresh();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, [lang]);

  useEffect(() => onNeuralStatus(setNeuralStatus), []);
  useEffect(() => onCloudTtsStatus(setCloudStatus), []);
  useEffect(() => {
    void ensureCloudTtsAvailable();
  }, []);

  const ranked = useMemo(() => listVoicesForLang(lang, voices), [lang, voices]);
  const best = ranked[0] ?? null;
  const onlyLowQuality = ranked.length > 0 && ranked.every((voice) => voiceQuality(voice) === 'standard');
  const cloudReady = cloudStatus === 'available';

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

  const neuralHint = cloudReady
    ? t('settings:voiceNaturalCloudReady')
    : neuralStatus === 'loading'
      ? t('settings:voiceNaturalLoading')
      : neuralStatus === 'ready'
        ? t('settings:voiceNaturalReady')
        : neuralStatus === 'error'
          ? t('settings:voiceNaturalError')
          : t('settings:voiceNaturalHelp');

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-2xl border border-border bg-card p-4">
        <label className="flex min-h-[56px] cursor-pointer items-start gap-3">
          <Switch
            checked={!!prefs.naturalVoice}
            disabled={!prefs.voiceEnabled}
            data-testid="natural-voice-toggle"
            onCheckedChange={(checked) => {
              setPref('naturalVoice', checked);
              announce(checked ? t('settings:voiceNaturalOn') : t('settings:voiceNaturalOff'));
              if (checked) {
                stopSpeaking();
                speak(sampleSpeechText(lang), { lang, ratePref: prefs.speechRate });
              }
            }}
            aria-label={t('settings:voiceNatural')}
            className="mt-1"
          />
          <span className="flex-1">
            <span className="flex items-center gap-2 font-medium">
              {t('settings:voiceNatural')}
              {(neuralStatus === 'loading' || cloudStatus === 'unknown') && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
              )}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">{neuralHint}</span>
            {cloudReady && prefs.naturalVoice ? (
              <span className="mt-2 block text-sm text-muted-foreground" data-testid="ai-voice-disclosure">
                {t('settings:voiceAiDisclosure')}
              </span>
            ) : null}
          </span>
        </label>
      </div>

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
        {onlyLowQuality && !prefs.naturalVoice && (
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
