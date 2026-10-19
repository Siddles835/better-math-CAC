import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import { stopSpeaking, unlockAudio } from '@/lib/speech';
import {
  ALLOY_REFERENCE_SAMPLE_URL,
  DEFAULT_CLOUD_VOICE,
  ensureCloudTtsAvailable,
  getCloudTtsStatus,
  onCloudTtsStatus,
  unlockCloudAudio,
  type CloudTtsStatus,
} from '@/lib/speechOpenAI';

/**
 * Voice settings: OpenAI Alloy only for all read-aloud.
 * Play sample uses the Alloy “quick brown fox” clip.
 */
const VoiceSettings: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation(['settings']);
  const { prefs, setPref, announce } = useAccessibility();
  const [cloudStatus, setCloudStatus] = useState<CloudTtsStatus>(() => getCloudTtsStatus());
  const [sampleBusy, setSampleBusy] = useState(false);
  const [sampleError, setSampleError] = useState(false);
  const alloyAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => onCloudTtsStatus(setCloudStatus), []);
  useEffect(() => {
    void ensureCloudTtsAvailable();
  }, []);

  useEffect(() => {
    if (prefs.naturalVoice) setPref('naturalVoice', false);
    if (prefs.cloudVoice !== DEFAULT_CLOUD_VOICE) setPref('cloudVoice', DEFAULT_CLOUD_VOICE);
    if (prefs.voiceURI) setPref('voiceURI', null);
  }, [prefs.naturalVoice, prefs.cloudVoice, prefs.voiceURI, setPref]);

  useEffect(() => {
    const audio = alloyAudioRef.current;
    if (!audio) return;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.preload = 'auto';
    try {
      audio.load();
    } catch {
      /* ignore */
    }
  }, []);

  const cloudReady = cloudStatus === 'available';

  const playAlloySample = async () => {
    unlockAudio();
    unlockCloudAudio();
    setSampleError(false);
    setSampleBusy(true);
    stopSpeaking({ skipAlloySample: true });

    const audio = alloyAudioRef.current;
    if (!audio) {
      setSampleBusy(false);
      setSampleError(true);
      announce(t('settings:voiceSampleFailed'));
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
      if (!audio.src || audio.error) {
        audio.src = ALLOY_REFERENCE_SAMPLE_URL;
        audio.load();
      }
      try {
        await audio.play();
      } catch {
        unlockCloudAudio();
        audio.load();
        await new Promise<void>((resolve) => {
          const done = () => {
            audio.removeEventListener('canplaythrough', done);
            resolve();
          };
          audio.addEventListener('canplaythrough', done, { once: true });
          window.setTimeout(resolve, 400);
        });
        await audio.play();
      }
      setSampleBusy(false);
    } catch {
      setSampleBusy(false);
      setSampleError(true);
      announce(t('settings:voiceSampleFailed'));
    }
  };

  const alloyHint =
    cloudStatus === 'unknown'
      ? t('settings:voiceAlloyChecking')
      : cloudReady
        ? t('settings:voiceAlloyListHint')
        : t('settings:voiceAlloyFallback');

  return (
    <div className={`space-y-4 ${className}`}>
      <audio
        ref={alloyAudioRef}
        src={ALLOY_REFERENCE_SAMPLE_URL}
        preload="auto"
        playsInline
        data-testid="alloy-sample-audio"
        className="sr-only"
        onEnded={() => setSampleBusy(false)}
        onPause={() => setSampleBusy(false)}
      />

      <div
        className="rounded-2xl border-2 border-primary/60 bg-primary/10 p-4"
        data-testid="openai-alloy-voice-card"
      >
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            aria-pressed
            data-testid="openai-alloy-voice-option"
            onPointerDown={() => {
              unlockAudio();
              unlockCloudAudio();
            }}
            onClick={() => {
              unlockAudio();
              unlockCloudAudio();
              setPref('voiceURI', null);
              setPref('cloudVoice', DEFAULT_CLOUD_VOICE);
              announce(t('settings:voiceAlloyName'));
              void playAlloySample();
            }}
            className="flex min-h-[64px] flex-1 items-start gap-3 rounded-xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex-1">
              <span className="block text-lg font-semibold text-foreground">
                {t('settings:voiceAlloyName')}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded-full border border-primary/40 bg-primary/20 px-2 py-0.5 text-xs text-foreground">
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
              {sampleError ? (
                <span className="mt-2 block text-sm text-destructive" data-testid="alloy-sample-error">
                  {t('settings:voiceSampleFailed')}
                </span>
              ) : null}
            </span>
            <Check className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
          </button>
          <Button
            type="button"
            variant="default"
            className="min-h-[64px] shrink-0"
            onPointerDown={() => {
              unlockAudio();
              unlockCloudAudio();
            }}
            onClick={() => {
              unlockAudio();
              unlockCloudAudio();
              void playAlloySample();
            }}
            data-testid="alloy-voice-sample"
            aria-busy={sampleBusy}
          >
            {sampleBusy ? <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {t('settings:voiceSample')}
          </Button>
        </div>
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
    </div>
  );
};

export default VoiceSettings;
