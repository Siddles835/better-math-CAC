/**
 * Clear cloud TTS via the MathLift /api/tts proxy (OpenAI gpt-4o-mini-tts).
 * The API key stays on the server. Falls back silently when unavailable.
 */

import type { SpeechRatePref } from '@/lib/speech';
import { prepareClearPlayback, unlockSpeechClarity } from '@/lib/speechClarity';

export type CloudTtsStatus = 'unknown' | 'available' | 'unavailable';

const cache = new Map<string, string>();
let status: CloudTtsStatus = 'unknown';
let probePromise: Promise<boolean> | null = null;
const statusListeners = new Set<(status: CloudTtsStatus) => void>();

/** Test-only: clear probe + blob cache between cases. */
export const resetCloudTtsForTests = () => {
  status = 'unknown';
  probePromise = null;
  lastProbeAt = 0;
  preferredCloudVoice = DEFAULT_CLOUD_VOICE;
  for (const url of cache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
  cache.clear();
  heldAudio = null;
  setStatus('unknown');
};

const setStatus = (next: CloudTtsStatus) => {
  status = next;
  for (const listener of statusListeners) listener(next);
};

export const getCloudTtsStatus = (): CloudTtsStatus => status;

export const onCloudTtsStatus = (listener: (status: CloudTtsStatus) => void): (() => void) => {
  statusListeners.add(listener);
  listener(status);
  return () => {
    statusListeners.delete(listener);
  };
};

const endpoint = (): string => {
  const base = (import.meta.env.VITE_TTS_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  return `${base}/api/tts`;
};

/**
 * Settings Play sample line (live Onyx TTS — not a baked female Alloy clip).
 */
export const CLOUD_SAMPLE_TEXT = 'The quick brown fox jumps over the lazy dog.';
/** @deprecated Use CLOUD_SAMPLE_TEXT */
export const ALLOY_SAMPLE_TEXT = CLOUD_SAMPLE_TEXT;

let referenceAudio: HTMLAudioElement | null = null;
/** Bumps on every play/stop so a stale stopSpeaking() cannot kill a new sample. */
let referenceToken = 0;

/**
 * Same HTMLAudioElement from the tap through the TTS fetch.
 * A brand-new Audio() after `await fetch` loses the user gesture and play() rejects,
 * which Settings shows as “Could not play the voice sample.”
 */
let heldAudio: HTMLAudioElement | null = null;
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export const primeCloudPlayback = (): void => {
  if (typeof Audio === 'undefined') return;
  try {
    if (!heldAudio) heldAudio = new Audio();
    const audio = heldAudio;
    unlockSpeechClarity();
    prepareClearPlayback(audio);
    if (!audio.src) audio.src = SILENT_WAV;
    const pending = audio.play();
    if (pending && typeof pending.catch === 'function') {
      void pending.catch(() => undefined);
    }
  } catch {
    heldAudio = null;
  }
};

const claimHeldAudio = (src: string): HTMLAudioElement => {
  const audio = heldAudio ?? new Audio();
  heldAudio = null;
  audio.src = src;
  return audio;
};

/** Drop a primed element so Stop does not leave a silent clip running. */
export const releaseCloudPlayback = (): void => {
  if (!heldAudio) return;
  try {
    heldAudio.pause();
  } catch {
    /* ignore */
  }
  heldAudio = null;
};

/**
 * Play the product cloud voice sample (Onyx) via /api/tts.
 * Kept name for callers; no longer uses the old Alloy data-URI clip.
 */
export const playAlloyReferenceSample = async (): Promise<boolean> => {
  const token = ++referenceToken;
  if (referenceAudio) {
    try {
      referenceAudio.pause();
    } catch {
      /* ignore */
    }
    referenceAudio = null;
  }
  return speakWithOpenAI(CLOUD_SAMPLE_TEXT, {
    token,
    isCurrent: (value) => value === referenceToken,
    ratePref: 'normal',
    bindAudio: (audio) => {
      referenceAudio = audio;
    },
  });
};

export const stopAlloyReferenceSample = () => {
  referenceToken += 1;
  if (!referenceAudio) return;
  try {
    referenceAudio.pause();
  } catch {
    /* ignore */
  }
  referenceAudio = null;
};

let lastProbeAt = 0;
const PROBE_RETRY_MS = 15_000;

/**
 * Probe /api/tts so Settings and speak() know if cloud Onyx is ready.
 * `force` skips the cooldown — Play sample must re-check immediately,
 * otherwise the first failed page-load probe blocks the button for 15s.
 */
export const ensureCloudTtsAvailable = async (
  options?: { retry?: boolean; force?: boolean }
): Promise<boolean> => {
  if (status === 'available') return true;
  const now = Date.now();
  const bypassCooldown =
    options?.force === true ||
    (options?.retry === true && now - lastProbeAt >= PROBE_RETRY_MS);
  if (status === 'unavailable' && !bypassCooldown) {
    return false;
  }
  if (probePromise) return probePromise;

  probePromise = (async () => {
    lastProbeAt = Date.now();
    try {
      const response = await fetch(endpoint(), { method: 'GET' });
      const contentType = response.headers.get('content-type') || '';
      // SPA fallback returns index.html — that is NOT a working TTS API.
      if (!response.ok || !contentType.includes('application/json')) {
        setStatus('unavailable');
        return false;
      }
      const data = (await response.json()) as { available?: boolean };
      const ok = !!data.available;
      setStatus(ok ? 'available' : 'unavailable');
      return ok;
    } catch {
      setStatus('unavailable');
      return false;
    } finally {
      probePromise = null;
    }
  })();

  return probePromise;
};

/** Bump when TTS format/instructions change so old muddy clips are not reused. */
const CACHE_VERSION = 'onyx-baritone-v2';

const cacheKey = (text: string, voice: string, ratePref: SpeechRatePref): string =>
  `${CACHE_VERSION}|${voice}|${ratePref}|${text}`;

export interface SpeakWithOpenAIOptions {
  token: number;
  isCurrent: (token: number) => boolean;
  ratePref?: SpeechRatePref;
  voice?: string;
  onEnd?: () => void;
  bindAudio?: (audio: HTMLAudioElement | null) => void;
}

/**
 * MathLift uses OpenAI Onyx (traditional masculine) for all cloud read-aloud.
 * Other gpt-4o-mini-tts ids remain listed for compatibility,
 * but the client always requests onyx.
 */
export const DEFAULT_CLOUD_VOICE = 'onyx';

/** Voices the /api/tts proxy accepts (gpt-4o-mini-tts). */
export const CLOUD_VOICE_IDS = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
] as const;

export type CloudVoiceId = (typeof CLOUD_VOICE_IDS)[number];

export const isCloudVoiceId = (value: string | null | undefined): value is CloudVoiceId =>
  !!value && (CLOUD_VOICE_IDS as readonly string[]).includes(value);

/** @deprecated Cloud voice picker removed — Onyx is fixed. Kept for type imports. */
export const CLOUD_VOICE_OPTIONS: ReadonlyArray<{ id: CloudVoiceId; label: string }> = [
  { id: 'onyx', label: 'Onyx' },
];

let preferredCloudVoice: CloudVoiceId = DEFAULT_CLOUD_VOICE;

export const setPreferredCloudVoice = (_voice?: string | null) => {
  // Always Onyx (traditional masculine) — ignore other selections so Settings cannot drift.
  preferredCloudVoice = DEFAULT_CLOUD_VOICE;
};

export const getPreferredCloudVoice = (): CloudVoiceId => DEFAULT_CLOUD_VOICE;

export const speakWithOpenAI = async (
  text: string,
  options: SpeakWithOpenAIOptions
): Promise<boolean> => {
  const cleaned = text.trim();
  if (!cleaned) {
    options.onEnd?.();
    return false;
  }

  const available = await ensureCloudTtsAvailable();
  if (!available || !options.isCurrent(options.token)) return false;

  // Product decision: always Onyx (traditional masculine) for classroom clarity.
  const voice = DEFAULT_CLOUD_VOICE;
  void options.voice;
  void preferredCloudVoice;
  const ratePref = options.ratePref === 'slow' ? 'slow' : 'normal';
  const key = cacheKey(cleaned, voice, ratePref);

  let objectUrl = cache.get(key);
  if (!objectUrl) {
    try {
      const response = await fetch(endpoint(), {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleaned.slice(0, 600),
          voice,
          ratePref,
        }),
      });
      if (!response.ok || !options.isCurrent(options.token)) return false;
      const contentType = response.headers?.get?.('content-type') || '';
      // Reject SPA HTML / JSON errors so we never try to "play" a document.
      if (contentType.includes('text/html') || contentType.includes('application/json')) {
        setStatus('unavailable');
        return false;
      }
      // Server must mint Onyx. Refuse drifted Ash or other clips.
      const spokenVoice = (response.headers?.get?.('x-mathlift-voice') || '').toLowerCase();
      if (spokenVoice && spokenVoice !== DEFAULT_CLOUD_VOICE) {
        setStatus('unavailable');
        return false;
      }
      const blob = await response.blob();
      if (!blob.size || !options.isCurrent(options.token)) return false;
      objectUrl = URL.createObjectURL(blob);
      cache.set(key, objectUrl);
      // Cap cache size so long sessions do not retain every clip forever.
      if (cache.size > 48) {
        const first = cache.keys().next().value;
        if (first) {
          const old = cache.get(first);
          cache.delete(first);
          if (old) URL.revokeObjectURL(old);
        }
      }
    } catch {
      setStatus('unavailable');
      return false;
    }
  }

  if (!options.isCurrent(options.token) || !objectUrl) return false;

  return await new Promise<boolean>((resolve) => {
    const audio = claimHeldAudio(objectUrl);
    unlockSpeechClarity();
    prepareClearPlayback(audio);
    options.bindAudio?.(audio);
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      options.bindAudio?.(null);
      if (ok) options.onEnd?.();
      resolve(ok);
    };
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    void audio.play().then(
      () => {
        /* playing */
      },
      () => finish(false)
    );
  });
};
