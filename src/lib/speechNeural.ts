/**
 * Tier 2: on-device neural TTS (Kokoro-82M) for English that sounds like a person.
 * Lazy-loaded. Never calls a cloud TTS API with children's text.
 */

export type NeuralStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
/** Warm American English female voice graded A. */
const VOICE = 'af_heart';
/** 1.0 is a normal speaking pace; slower values sound unnatural. */
const SPEED_NORMAL = 1;
const SPEED_SLOW = 0.88;

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
 * Shape English for Kokoro: keep natural sentence rhythm.
 * Only expand math signs; leave everyday wording alone.
 */
export const normalizeForNeural = (text: string): string => {
  let next = text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  next = next.replace(/(\d+)\s*[−–—-]\s*(\d+)/g, '$1 minus $2');
  next = next.replace(/(\d+)\s*\+\s*(\d+)/g, '$1 plus $2');
  next = next.replace(/(\d+)\s*[×x]\s*(\d+)/g, '$1 times $2');
  next = next.replace(/(\d+)\s*÷\s*(\d+)/g, '$1 divided by $2');
  next = next.replace(/=\s*\?/g, ' equals what?');
  next = next.replace(/=/g, ' equals ');
  // Digits stay as digits: Kokoro reads them more naturally than forced word lists.
  return next.replace(/\s+/g, ' ').trim();
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
    const speed = options.ratePref === 'slow' ? SPEED_SLOW : SPEED_NORMAL;
    const raw = await ttsInstance.generate(spoken, { voice: VOICE, speed });
    if (!options.isCurrent(options.token)) return false;
    const blob: Blob = raw.toBlob();
    return playBlob(blob, options);
  } catch (error) {
    console.warn('Natural voice playback failed; falling back.', error);
    options.bindAudio?.(null);
    return false;
  }
};
