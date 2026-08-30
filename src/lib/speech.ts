// Shared text-to-speech helper built on the browser's Web Speech API.

const EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

let voicesPrimed = false;
let speakTimer: ReturnType<typeof setTimeout> | null = null;

export const isSpeechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Speak math symbols as words. iOS/WebKit voices often skip the minus sign
 * ("8 − 3" is read as "8 3"), so equations must be spelled out.
 */
const mathSymbolsToWords = (text: string) =>
  text
    // Unicode minus / en dash / hyphen between numbers → "minus"
    .replace(/(\d)\s*[−–-]\s*(\d)/g, '$1 minus $2')
    .replace(/[−–]/g, ' minus ')
    .replace(/(\d)\s*\+\s*(\d)/g, '$1 plus $2')
    .replace(/\+/g, ' plus ')
    .replace(/(\d)\s*[×x]\s*(\d)/g, '$1 times $2')
    .replace(/(\d)\s*÷\s*(\d)/g, '$1 divided by $2')
    .replace(/=\s*\?/g, ' equals what?')
    .replace(/=/g, ' equals ');

/** Remove emoji, speak math symbols, and collapse whitespace so the voice reads real words. */
const cleanForSpeech = (text: string) =>
  mathSymbolsToWords(text.replace(EMOJI_REGEX, ' ')).replace(/\s+/g, ' ').trim();

const primeVoices = () => {
  if (!isSpeechSupported() || voicesPrimed) return;
  const load = () => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) voicesPrimed = true;
  };
  load();
  if (!voicesPrimed) {
    speechSynthesis.addEventListener('voiceschanged', load, { once: true });
  }
};

const pickEnglishVoice = (): SpeechSynthesisVoice | null => {
  if (!isSpeechSupported()) return null;
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith('en') && /child|kid|samantha|karen|moira/i.test(v.name)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
    null
  );
};

export interface SpeakOptions {
  onEnd?: () => void;
}

/**
 * Speak text aloud with a slow, kid-friendly voice.
 * Cancels any speech already in progress.
 * @returns true if speech was queued
 */
export const speak = (text: string, options?: SpeakOptions): boolean => {
  if (!isSpeechSupported()) {
    options?.onEnd?.();
    return false;
  }

  const cleaned = cleanForSpeech(text);
  if (!cleaned) {
    options?.onEnd?.();
    return false;
  }

  primeVoices();
  if (speakTimer) {
    clearTimeout(speakTimer);
    speakTimer = null;
  }

  // Check before cancel so a fresh tap can speak inside the iOS user-gesture window.
  const wasSpeaking = speechSynthesis.speaking || speechSynthesis.pending;
  speechSynthesis.cancel();

  const start = () => {
    speakTimer = null;
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.rate = 0.85;
    utterance.pitch = 1.15;
    const voice = pickEnglishVoice();
    if (voice) utterance.voice = voice;

    const finish = () => options?.onEnd?.();
    utterance.onend = finish;
    utterance.onerror = finish;
    speechSynthesis.speak(utterance);
  };

  // iOS WKWebView often needs a tick after cancel before a new utterance works.
  if (wasSpeaking) {
    speakTimer = setTimeout(start, 40);
  } else {
    start();
  }

  return true;
};

export const stopSpeaking = () => {
  if (speakTimer) {
    clearTimeout(speakTimer);
    speakTimer = null;
  }
  if (isSpeechSupported()) {
    speechSynthesis.cancel();
  }
};

// Warm voices early when the module loads in the browser.
if (typeof window !== 'undefined') {
  primeVoices();
}
