/**
 * Tier 2: on-device neural TTS (Kokoro-82M) for warm English speech.
 * Lazy-loaded only when enabled. Never calls a cloud TTS API.
 */

export type NeuralStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE = 'af_heart';
const SPEED = 0.9;

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
  if (!enabled) {
    // Keep the model warm if already loaded; just stop using it.
    if (status === 'loading') return;
  }
};

export const isNaturalVoiceEnabled = (): boolean => naturalEnabled;

const pickDevice = async (): Promise<'webgpu' | 'wasm'> => {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      // @ts-expect-error WebGPU typings vary by TS lib
      const adapter = await navigator.gpu?.requestAdapter?.();
      if (adapter) return 'webgpu';
    } catch {
      // fall through to wasm
    }
  }
  return 'wasm';
};

/** Load the q8 Kokoro model once. Safe to call repeatedly. */
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
      const { KokoroTTS } = await import('kokoro-js');
      ttsInstance = await KokoroTTS.from_pretrained(MODEL_ID, {
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

export const speakWithNeural = async (
  text: string,
  options: {
    token: number;
    isCurrent: (token: number) => boolean;
    ratePref?: 'slow' | 'normal';
    onEnd?: () => void;
    bindAudio?: (audio: HTMLAudioElement | null) => void;
  }
): Promise<boolean> => {
  if (!naturalEnabled || !text.trim()) return false;
  // Never block the first read-aloud on a 90 MB download. Warm in the background
  // and use neural only once the model is already ready.
  if (status !== 'ready' || !ttsInstance) {
    if (status === 'idle' || status === 'error') void ensureNeuralReady();
    return false;
  }
  if (!options.isCurrent(options.token)) return false;

  try {
    const raw = await ttsInstance.generate(text, { voice: VOICE, speed: SPEED });
    if (!options.isCurrent(options.token)) return false;
    const blob: Blob = raw.toBlob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    options.bindAudio?.(audio);
    audio.preservesPitch = true;
    audio.playbackRate = options.ratePref === 'slow' ? 0.9 : 1;

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        options.bindAudio?.(null);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        options.bindAudio?.(null);
        reject(new Error('neural playback failed'));
      };
      void audio.play().catch(reject);
    });

    if (options.isCurrent(options.token)) options.onEnd?.();
    return true;
  } catch (error) {
    console.warn('Natural voice playback failed; falling back.', error);
    options.bindAudio?.(null);
    return false;
  }
};
