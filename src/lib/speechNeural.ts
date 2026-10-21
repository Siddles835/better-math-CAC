/**
 * Tier 2: on-device neural TTS (Kokoro-82M) for English that sounds like a person.
 * Lazy-loaded. Never calls a cloud TTS API with children's text.
 */

import { prepareClearPlayback, unlockSpeechClarity } from '@/lib/speechClarity';

export type NeuralStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
/**
 * Adam: clear American English male (matches cloud Onyx gender).
 */
const VOICE = 'am_adam';
/** Classroom pace — a bit under “brisk” so consonants stay clear. */
const SPEED_NORMAL = 0.95;
const SPEED_SLOW = 0.82;
/** Short breath between sentences, like a person pausing. */
const BREATH_MS = 140;

let status: NeuralStatus = 'idle';
let loadPromise: Promise<boolean> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ttsInstance: any = null;
let naturalEnabled = true;
const statusListeners = new Set<(status: NeuralStatus) => void>();

const setStatus = (next: NeuralStatus) => {
  status = next;
  for (const listener of statusListeners) listener(next);
};

export const getNeuralStatus = (): NeuralStatus => status;

export const onNeuralStatus = (listener: (status: NeuralStatus) => void): (() => void) => {
  statusListeners.add(listener);
  listener(status);
  return () => {
    statusListeners.delete(listener);
  };
};

export const setNaturalVoiceEnabled = (enabled: boolean) => {
  naturalEnabled = enabled;
};

export const isNaturalVoiceEnabled = (): boolean => naturalEnabled;

const pickDevice = async (): Promise<'webgpu' | 'wasm'> => {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      // @ts-expect-error WebGPU typings vary by TS lib
      const adapter = await navigator.gpu?.requestAdapter?.();
      if (adapter) return 'webgpu';
    } catch {
      // fall through
    }
  }
  return 'wasm';
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Load Kokoro once. Safe to call repeatedly. */
export const ensureNeuralReady = async (): Promise<boolean> => {
  if (!naturalEnabled) return false;
  if (typeof window === 'undefined') {
    setStatus('unsupported');
    return false;
  }
  if (ttsInstance && status === 'ready') return true;
  if (loadPromise) return loadPromise;

  setStatus('loading');
  loadPromise = (async () => {
    try {
      const device = await pickDevice();
      const mod = await import('kokoro-js');
      // Ensure Hugging Face model files can be fetched and cached.
      const runtimeEnv = mod.env as { allowRemoteModels?: boolean; useBrowserCache?: boolean };
      if (runtimeEnv) {
        runtimeEnv.allowRemoteModels = true;
        runtimeEnv.useBrowserCache = true;
      }
      ttsInstance = await mod.KokoroTTS.from_pretrained(MODEL_ID, {
        // fp32 + webgpu is clearer; q8 + wasm is the portable fallback.
        dtype: device === 'webgpu' ? 'fp32' : 'q8',
        device,
      });
      setStatus('ready');
      return true;
    } catch (error) {
      console.warn('Natural voice failed to load; using device voice.', error);
      ttsInstance = null;
      setStatus('error');
      loadPromise = null;
      return false;
    }
  })();

  return loadPromise;
};

/**
 * Shape English the way a person would say it out loud.
 * Expand math signs; keep wording casual, not teleprompter-stiff.
 */
export const normalizeForNeural = (text: string): string => {
  let next = text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  // Full question forms first, so we never say "equals what".
  next = next.replace(/(\d+)\s*\+\s*(\d+)\s*=\s*\?/g, 'what is $1 plus $2?');
  next = next.replace(/(\d+)\s*[−–—-]\s*(\d+)\s*=\s*\?/g, 'what is $1 minus $2?');
  next = next.replace(/(\d+)\s*[×x]\s*(\d+)\s*=\s*\?/g, 'what is $1 times $2?');
  next = next.replace(/(\d+)\s*÷\s*(\d+)\s*=\s*\?/g, 'what is $1 divided by $2?');
  next = next.replace(/(\d+)\s*[−–—-]\s*(\d+)/g, '$1 minus $2');
  next = next.replace(/(\d+)\s*\+\s*(\d+)/g, '$1 plus $2');
  next = next.replace(/(\d+)\s*[×x]\s*(\d+)/g, '$1 times $2');
  next = next.replace(/(\d+)\s*÷\s*(\d+)/g, '$1 divided by $2');
  next = next.replace(/=\s*\?/g, '?');
  next = next.replace(/=/g, ' is ');
  // Soften leftover textbook phrasing from older copy.
  next = next.replace(/\bequals what\??/gi, 'what is that');
  next = next.replace(/\bequals\b/gi, 'is');
  // Digits stay as digits: Kokoro already reads them naturally.
  return next.replace(/\s+/g, ' ').trim().replace(/\s+\?/g, '?');
};

const playBlob = (
  blob: Blob,
  options: {
    token: number;
    isCurrent: (token: number) => boolean;
    onEnd?: () => void;
    bindAudio?: (audio: HTMLAudioElement | null) => void;
  }
): Promise<boolean> =>
  new Promise((resolve) => {
    if (!options.isCurrent(options.token)) {
      resolve(false);
      return;
    }
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    options.bindAudio?.(audio);
    // Do not change playbackRate: it makes neural voices sound metallic.
    unlockSpeechClarity();
    prepareClearPlayback(audio);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      options.bindAudio?.(null);
      if (options.isCurrent(options.token)) options.onEnd?.();
      resolve(true);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      options.bindAudio?.(null);
      resolve(false);
    };
    void audio.play().then(
      () => undefined,
      () => {
        URL.revokeObjectURL(url);
        options.bindAudio?.(null);
        resolve(false);
      }
    );
  });

/**
 * Generate sentence-by-sentence so intonation resets like real speech,
 * then play with a short breath between lines.
 */
const generateAndPlay = async (
  spoken: string,
  options: {
    token: number;
    isCurrent: (token: number) => boolean;
    ratePref?: 'slow' | 'normal';
    onEnd?: () => void;
    bindAudio?: (audio: HTMLAudioElement | null) => void;
  }
): Promise<boolean> => {
  const speed = options.ratePref === 'slow' ? SPEED_SLOW : SPEED_NORMAL;
  const clips: Blob[] = [];

  // Stream by sentence: long one-shot generations sound flat and "AI".
  if (typeof ttsInstance.stream === 'function') {
    for await (const part of ttsInstance.stream(spoken, { voice: VOICE, speed })) {
      if (!options.isCurrent(options.token)) return false;
      const audio = part?.audio;
      if (!audio?.toBlob) continue;
      clips.push(audio.toBlob() as Blob);
    }
  } else {
    const raw = await ttsInstance.generate(spoken, { voice: VOICE, speed });
    if (!options.isCurrent(options.token)) return false;
    clips.push(raw.toBlob() as Blob);
  }

  if (clips.length === 0) return false;

  for (let i = 0; i < clips.length; i += 1) {
    if (!options.isCurrent(options.token)) return false;
    const isLast = i === clips.length - 1;
    const ok = await playBlob(clips[i], {
      token: options.token,
      isCurrent: options.isCurrent,
      bindAudio: options.bindAudio,
      onEnd: isLast ? options.onEnd : undefined,
    });
    if (!ok) return false;
    if (!isLast && options.isCurrent(options.token)) {
      await sleep(BREATH_MS);
    }
  }
  return true;
};

export const speakWithNeural = async (
  text: string,
  options: {
    token: number;
    isCurrent: (token: number) => boolean;
    ratePref?: 'slow' | 'normal';
    onEnd?: () => void;
    bindAudio?: (audio: HTMLAudioElement | null) => void;
    /** When true, wait for the model (first download) instead of falling back. */
    waitForModel?: boolean;
  }
): Promise<boolean> => {
  if (!naturalEnabled || !text.trim()) return false;

  if (status !== 'ready' || !ttsInstance) {
    if (options.waitForModel) {
      const ready = await ensureNeuralReady();
      if (!ready || !options.isCurrent(options.token)) return false;
    } else {
      if (status === 'idle' || status === 'error') void ensureNeuralReady();
      return false;
    }
  }
  if (!options.isCurrent(options.token) || !ttsInstance) return false;

  try {
    const spoken = normalizeForNeural(text);
    if (!spoken) return false;
    return generateAndPlay(spoken, options);
  } catch (error) {
    console.warn('Natural voice playback failed; falling back.', error);
    options.bindAudio?.(null);
    return false;
  }
};
