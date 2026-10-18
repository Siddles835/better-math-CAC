import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
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
import {
  DEFAULT_CLOUD_VOICE,
  ensureCloudTtsAvailable,
  getCloudTtsStatus,
  onCloudTtsStatus,
  type CloudTtsStatus,
} from '@/lib/speechOpenAI';

/** Pref key: null / empty voiceURI means OpenAI Alloy is selected. */
const ALLOY_SELECTED_URI = null;

/**
 * Voice list with OpenAI Alloy first (always visible), then device backups.
 * Natural / Kokoro stays off. Lessons use Alloy when /api/tts is available.
 */
const VoiceSettings: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t, i18n } = useTranslation(['settings']);
  const { prefs, setPref, announce } = useAccessibility();
  const lang = isAppLang(i18n.language) ? i18n.language : 'en';
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [cloudStatus, setCloudStatus] = useState<CloudTtsStatus>(() => getCloudTtsStatus());

  useEffect(() => {
    const refresh = () => setVoices(getVoices());
    refresh();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, [lang]);

  useEffect(() => onCloudTtsStatus(setCloudStatus), []);
  useEffect(() => {
    void ensureCloudTtsAvailable();
  }, []);

  useEffect(() => {
    if (prefs.naturalVoice) setPref('naturalVoice', false);
    if (prefs.cloudVoice !== DEFAULT_CLOUD_VOICE) setPref('cloudVoice', DEFAULT_CLOUD_VOICE);
    // Keep OpenAI Alloy selected in the list (voiceURI null = Alloy).
    if (prefs.voiceURI) setPref('voiceURI', null);
  }, [prefs.naturalVoice, prefs.cloudVoice, prefs.voiceURI, setPref]);

  const ranked = useMemo(() => listVoicesForLang(lang, voices), [lang, voices]);
  const cloudReady = cloudStatus === 'available';
  const alloySelected = !prefs.voiceURI;

  const playAlloySample = () => {
    if (!prefs.voiceEnabled) {
      announce(t('settings:voiceOff'));
      return;
    }
    stopSpeaking();
    speak(sampleSpeechText(lang), {
      lang,
      ratePref: prefs.speechRate,
      cloudVoice: DEFAULT_CLOUD_VOICE,
    });
  };

  const playDeviceSample = (voiceURI: string | null) => {
    if (!prefs.voiceEnabled) {
      announce(t('settings:voiceOff'));
      return;
    }
    stopSpeaking();
    speak(sampleSpeechText(lang), {
      lang,
      voiceURI,
      ratePref: prefs.speechRate,
      preferDevice: true,
    });
  };

  const selectAlloy = () => {
    setPref('voiceURI', ALLOY_SELECTED_URI);
    setPref('cloudVoice', DEFAULT_CLOUD_VOICE);
    announce(t('settings:voiceAlloyName'));
    playAlloySample();
  };

  const alloyHint =
    cloudStatus === 'unknown'
      ? t('settings:voiceAlloyChecking')
      : cloudReady
        ? t('settings:voiceAlloyListHint')
        : t('settings:voiceAlloyFallback');

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

        <ul className="space-y-2" data-testid="voice-picker-list">
          {/* OpenAI Alloy — always first so users can find it in the list */}
          <li>
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                aria-pressed={alloySelected}
                data-testid="openai-alloy-voice-option"
                onClick={selectAlloy}
                className="flex min-h-[56px] flex-1 items-start gap-3 rounded-2xl border border-border bg-card p-4 text-start hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex-1">
                  <span className="font-medium">{t('settings:voiceAlloyName')}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {t('settings:voiceQualityNatural')}
                    </span>
                    {cloudStatus === 'unknown' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : null}
                    <span>{alloyHint}</span>
                  </span>
                  {cloudReady ? (
                    <span
                      className="mt-2 block text-sm text-muted-foreground"
                      data-testid="ai-voice-disclosure"
                    >
                      {t('settings:voiceAiDisclosure')}
                    </span>
                  ) : null}
                </span>
                {alloySelected ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
              </button>
              <Button
                type="button"
                variant="outline"
                className="min-h-[56px] shrink-0"
                disabled={!prefs.voiceEnabled}
                onClick={playAlloySample}
                data-testid="alloy-voice-sample"
              >
                {t('settings:voiceSample')}
              </Button>
            </div>
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
                      playDeviceSample(voice.voiceURI);
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
                        <span className="text-xs">{t('settings:voiceDeviceBackup')}</span>
                      </span>
                    </span>
                    {selected ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[56px] shrink-0"
                    onClick={() => playDeviceSample(voice.voiceURI)}
                  >
                    {t('settings:voiceSample')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default VoiceSettings;
