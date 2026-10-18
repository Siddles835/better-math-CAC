/**
 * Clear cloud TTS via the MathLift /api/tts proxy (OpenAI gpt-4o-mini-tts).
 * The API key stays on the server. Falls back silently when unavailable.
 */

import type { SpeechRatePref } from '@/lib/speech';

export type CloudTtsStatus = 'unknown' | 'available' | 'unavailable';

const cache = new Map<string, string>();
let status: CloudTtsStatus = 'unknown';
let probePromise: Promise<boolean> | null = null;
const statusListeners = new Set<(status: CloudTtsStatus) => void>();

/** Test-only: clear probe + blob cache between cases. */
export const resetCloudTtsForTests = () => {
  status = 'unknown';
  probePromise = null;
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

/** One-time probe so Settings can show the clear-voice option. */
export const ensureCloudTtsAvailable = async (): Promise<boolean> => {
  if (status === 'available') return true;
  if (status === 'unavailable') return false;
  if (probePromise) return probePromise;

  probePromise = (async () => {
    try {
      const response = await fetch(endpoint(), { method: 'GET' });
      if (!response.ok) {
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
 * Warm, clear default for kids. Marin/cedar are also excellent;
 * coral matches the OpenAI docs cheerful classroom example.
 */
export const DEFAULT_CLOUD_VOICE = 'coral';

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

  const voice = options.voice || DEFAULT_CLOUD_VOICE;
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
      if (!response.ok || !options.isCurrent(options.token)) return false;
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
    const audio = new Audio(objectUrl);
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
