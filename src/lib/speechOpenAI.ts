/**
 * Clear cloud TTS via the MathLift /api/tts proxy (OpenAI gpt-4o-mini-tts).
 * The API key stays on the server. Falls back silently when unavailable.
 */

import type { SpeechRatePref } from '@/lib/speech';
import { ALLOY_SAMPLE_DATA_URI } from '@/assets/audio/openaiAlloySampleData';

export type CloudTtsStatus = 'unknown' | 'available' | 'unavailable';

const cache = new Map<string, string>();
let status: CloudTtsStatus = 'unknown';
let probePromise: Promise<boolean> | null = null;
const statusListeners = new Set<(status: CloudTtsStatus) => void>();

/** One shared element — iOS only unlocks the element that played during a gesture. */
let cloudAudio: HTMLAudioElement | null = null;
let cloudUnlocked = false;

const SILENT_MP3 =
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4OjE2LjEwMAAAAAAAAAAAAAAAAC1FWERTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+1DEAAADAAAhHgAADUQAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

const getCloudAudio = (): HTMLAudioElement | null => {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!cloudAudio) {
    cloudAudio = new Audio();
    cloudAudio.setAttribute('playsinline', 'true');
    cloudAudio.setAttribute('webkit-playsinline', 'true');
    cloudAudio.preload = 'auto';
  }
  return cloudAudio;
};

/**
 * Must run inside a user gesture (pointerdown/click) so later async Alloy
 * playback on the same element is allowed after /api/tts returns.
 */
export const unlockCloudAudio = (): void => {
  if (typeof window === 'undefined') return;
  const audio = getCloudAudio();
  if (!audio) return;
  cloudUnlocked = true;
  try {
    const prev = audio.src;
    audio.src = SILENT_MP3;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      void playPromise
        .then(() => {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {
            /* ignore */
          }
          if (prev && prev !== SILENT_MP3) audio.src = prev;
        })
        .catch(() => undefined);
    }
  } catch {
    /* ignore */
  }
};

/** Test-only: clear probe + blob cache between cases. */
export const resetCloudTtsForTests = () => {
  status = 'unknown';
  probePromise = null;
  lastProbeAt = 0;
  preferredCloudVoice = DEFAULT_CLOUD_VOICE;
  cloudUnlocked = false;
  if (cloudAudio) {
    try {
      cloudAudio.pause();
    } catch {
      /* ignore */
    }
    cloudAudio = null;
  }
  for (const url of cache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
  cache.clear();
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
 * Settings Play sample: only the OpenAI Alloy line
 * “The quick brown fox jumps over the lazy dog.”
 */
export const ALLOY_SAMPLE_TEXT = 'The quick brown fox jumps over the lazy dog.';

/**
 * Inlined OpenAI Alloy “quick brown fox” clip (Settings Play sample).
 * Data URI so playback does not depend on a separate /assets/*.mp3 fetch.
 */
export const ALLOY_REFERENCE_SAMPLE_URL = ALLOY_SAMPLE_DATA_URI;

let referenceAudio: HTMLAudioElement | null = null;
/** Bumps on every play/stop so a stale stopSpeaking() cannot kill a new sample. */
let referenceToken = 0;

/** Play the real OpenAI Alloy sample the product ships with. */
export const playAlloyReferenceSample = (): Promise<boolean> => {
  unlockCloudAudio();
  const token = ++referenceToken;
  return new Promise((resolve) => {
    try {
      if (referenceAudio) {
        try {
          referenceAudio.pause();
        } catch {
          /* ignore */
        }
        referenceAudio = null;
      }
      // Prefer the shared unlocked element so iOS allows playback.
      const audio = getCloudAudio() ?? new Audio();
      audio.src = ALLOY_REFERENCE_SAMPLE_URL;
      audio.preload = 'auto';
      try {
        audio.load();
      } catch {
        /* ignore */
      }
      referenceAudio = audio;
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (referenceToken === token && referenceAudio === audio) {
          referenceAudio = null;
        }
        resolve(ok);
      };
      audio.onended = () => {
        if (referenceToken !== token) {
          resolve(false);
          return;
        }
        finish(true);
      };
      audio.onerror = () => finish(false);
      void audio.play().then(
        () => {
          /* playing — keep referenceAudio so stop can pause it */
        },
        () => finish(false)
      );
    } catch {
      resolve(false);
    }
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
const PROBE_RETRY_MS = 5_000;

/** Probe /api/tts so Settings and speak() know if Alloy cloud is ready. */
export const ensureCloudTtsAvailable = async (
  options?: { retry?: boolean; force?: boolean }
): Promise<boolean> => {
  if (status === 'available' && !options?.force) return true;
  const now = Date.now();
  // Allow a re-probe after a short cooldown (host may have gained an API key).
  if (
    status === 'unavailable' &&
    !options?.force &&
    !(options?.retry && now - lastProbeAt >= PROBE_RETRY_MS)
  ) {
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

const cacheKey = (text: string, voice: string, ratePref: SpeechRatePref): string =>
  `${voice}|${ratePref}|${text}`;

export interface SpeakWithOpenAIOptions {
  token: number;
  isCurrent: (token: number) => boolean;
  ratePref?: SpeechRatePref;
  voice?: string;
  onEnd?: () => void;
  bindAudio?: (audio: HTMLAudioElement | null) => void;
}

/**
 * MathLift uses OpenAI Alloy for all cloud read-aloud.
 * Other gpt-4o-mini-tts ids remain accepted by the proxy for compatibility,
 * but the client always requests alloy.
 */
export const DEFAULT_CLOUD_VOICE = 'alloy';

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

/** @deprecated Cloud voice picker removed — Alloy is fixed. Kept for type imports. */
export const CLOUD_VOICE_OPTIONS: ReadonlyArray<{ id: CloudVoiceId; label: string }> = [
  { id: 'alloy', label: 'Alloy' },
];

let preferredCloudVoice: CloudVoiceId = DEFAULT_CLOUD_VOICE;

export const setPreferredCloudVoice = (_voice?: string | null) => {
  // Always Alloy — ignore other selections so Settings cannot drift.
  preferredCloudVoice = DEFAULT_CLOUD_VOICE;
};

export const getPreferredCloudVoice = (): CloudVoiceId => DEFAULT_CLOUD_VOICE;

const isAudioResponse = (response: Response): boolean => {
  const contentType = response.headers.get('content-type') || '';
  return (
    response.ok &&
    (contentType.includes('audio/') ||
      contentType.includes('octet-stream') ||
      contentType.includes('mpeg'))
  );
};

const playObjectUrl = (
  objectUrl: string,
  options: SpeakWithOpenAIOptions
): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    const audio = getCloudAudio() ?? new Audio();
    // Stop any prior clip on the shared element.
    try {
      audio.pause();
    } catch {
      /* ignore */
    }
    audio.onended = null;
    audio.onerror = null;
    audio.src = objectUrl;
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
      () => {
        // Last chance: if unlock never ran, try once more after priming.
        if (!cloudUnlocked) {
          unlockCloudAudio();
        }
        void audio.play().then(
          () => {
            /* playing after retry */
          },
          () => finish(false)
        );
      }
    );
  });

export const speakWithOpenAI = async (
  text: string,
  options: SpeakWithOpenAIOptions
): Promise<boolean> => {
  const cleaned = text.trim();
  if (!cleaned) {
    options.onEnd?.();
    return false;
  }

  // Do not block on GET probe when we already know the host is up — and when
  // status is unknown/unavailable, still attempt POST (probe can lag deploy).
  if (status === 'unavailable') {
    const ok = await ensureCloudTtsAvailable({ retry: true, force: false });
    // Even if probe still says no, try POST once — GET SPA fallback used to
    // brick Alloy forever while the function was actually reachable.
    if (!ok) {
      /* fall through and attempt POST */
    }
  } else if (status === 'unknown') {
    void ensureCloudTtsAvailable({ retry: true });
  }

  if (!options.isCurrent(options.token)) return false;

  // Product decision: always Alloy for classroom clarity.
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleaned.slice(0, 600),
          voice,
          ratePref,
        }),
      });
      if (!options.isCurrent(options.token)) return false;
      // SPA HTML or JSON error = not Alloy audio.
      if (!isAudioResponse(response)) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html') || response.status === 503 || response.status === 502) {
          setStatus('unavailable');
        }
        return false;
      }
      const blob = await response.blob();
      if (!blob.size || !options.isCurrent(options.token)) return false;
      // Guard against HTML mistakenly typed as octet-stream.
      if (blob.type.includes('html')) {
        setStatus('unavailable');
        return false;
      }
      objectUrl = URL.createObjectURL(blob);
      cache.set(key, objectUrl);
      setStatus('available');
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

  return playObjectUrl(objectUrl, options);
};
