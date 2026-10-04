import type { AppLang } from '@/lib/cognition/readingTime';
import { loadLanguage } from '@/lib/i18n/language';

const EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
/** Strip leftover symbols that should not be spoken. */
const SYMBOL_REGEX = /[★☆✔✗✕•◆►◀←→↑↓©®™#*_~`|\\/<>[\]{}]/g;

let voicesPrimed = false;
let speakTimer: ReturnType<typeof setTimeout> | null = null;
let queueTimers: ReturnType<typeof setTimeout>[] = [];
let speechMuted = false;
let preferredVoiceURI: string | null = null;
let speechRatePref: SpeechRatePref = 'normal';
let unavailableHandler: (() => void) | null = null;

export type SpeechRatePref = 'slow' | 'normal';

/** Gentle K–2 defaults: clear, not rushed. Pitch near natural. */
export const K2_SPEECH_RATE = 0.93;
export const K2_SPEECH_RATE_SLOW = 0.88;
export const K2_SPEECH_PITCH = 1.0;
export const SENTENCE_GAP_MS = 280;
export const CLAUSE_GAP_MS = 140;

export const setSpeechMuted = (muted: boolean) => {
  speechMuted = muted;
  if (muted) stopSpeaking();
};

export const isSpeechMuted = () => speechMuted;

export const setPreferredVoiceURI = (uri: string | null) => {
  preferredVoiceURI = uri && uri.length > 0 ? uri : null;
};

export const getPreferredVoiceURI = () => preferredVoiceURI;

export const setSpeechRatePref = (rate: SpeechRatePref) => {
  speechRatePref = rate === 'slow' ? 'slow' : 'normal';
};

export const getSpeechRatePref = (): SpeechRatePref => speechRatePref;

export const rateForPref = (pref: SpeechRatePref = speechRatePref): number =>
  pref === 'slow' ? K2_SPEECH_RATE_SLOW : K2_SPEECH_RATE;

export const isSpeechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export const setSpeechUnavailableHandler = (handler: (() => void) | null) => {
  unavailableHandler = handler;
};

const EN = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const EN_TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const ES = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve'];
const ES_TENS = ['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const HI = ['शून्य','एक','दो','तीन','चार','पांच','छह','सात','आठ','नौ','दस','ग्यारह','बारह','तेरह','चौदह','पंद्रह','सोलह','सत्रह','अठारह','उन्नीस','बीस'];
const HI_TENS = ['','','बीस','तीस','चालीस','पचास','साठ','सत्तर','अस्सी','नब्बे'];
const AR = ['صفر','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
const AR_TENS = ['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
const ZH = ['零','一','二','三','四','五','六','七','八','九'];

const wordsUnder100 = (n: number, lang: AppLang): string => {
  const value = Math.max(0, Math.min(100, Math.trunc(n)));
  if (value === 100) {
    if (lang === 'zh-Hans') return '一百';
    if (lang === 'hi') return 'सौ';
    if (lang === 'es') return 'cien';
    if (lang === 'ar') return 'مئة';
    return 'one hundred';
  }
  if (lang === 'zh-Hans') {
    if (value <= 10) return value === 10 ? '十' : ZH[value];
    if (value < 20) return `十${ZH[value - 10]}`;
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return ones === 0 ? `${ZH[tens]}十` : `${ZH[tens]}十${ZH[ones]}`;
  }
  if (value < 20) {
    if (lang === 'es') return ES[value];
    if (lang === 'hi') return HI[value];
    if (lang === 'ar') return AR[value];
    return EN[value];
  }
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  if (lang === 'es') {
    if (value === 20) return 'veinte';
    if (value < 30) return `veinti${ES[ones] === 'uno' ? 'uno' : ES[ones]}`;
    return ones === 0 ? ES_TENS[tens] : `${ES_TENS[tens]} y ${ES[ones]}`;
  }
  if (lang === 'hi') return ones === 0 ? HI_TENS[tens] : `${HI_TENS[tens]} ${HI[ones]}`;
  if (lang === 'ar') return ones === 0 ? AR_TENS[tens] : `${AR[ones]} و${AR_TENS[tens]}`;
  return ones === 0 ? EN_TENS[tens] : `${EN_TENS[tens]}-${EN[ones]}`;
};

const minusPhrase = (a: string, b: string, lang: AppLang) => {
  if (lang === 'zh-Hans') return `${a}减${b}`;
  if (lang === 'hi') return `${a} में से ${b} घटाओ`;
  if (lang === 'es') return `${a} menos ${b}`;
  if (lang === 'ar') return `${a} ناقص ${b}`;
  return `${a} minus ${b}`;
};

const plusPhrase = (a: string, b: string, lang: AppLang) => {
  if (lang === 'zh-Hans') return `${a}加${b}`;
  if (lang === 'hi') return `${a} जमा ${b}`;
  if (lang === 'es') return `${a} más ${b}`;
  if (lang === 'ar') return `${a} زائد ${b}`;
  return `${a} plus ${b}`;
};

const timesPhrase = (a: string, b: string, lang: AppLang) => {
  if (lang === 'zh-Hans') return `${a}乘${b}`;
  if (lang === 'hi') return `${a} गुणा ${b}`;
  if (lang === 'es') return `${a} por ${b}`;
  if (lang === 'ar') return `${a} ضرب ${b}`;
  return `${a} times ${b}`;
};

const dividePhrase = (a: string, b: string, lang: AppLang) => {
  if (lang === 'zh-Hans') return `${a}除以${b}`;
  if (lang === 'hi') return `${a} में ${b} का भाग`;
  if (lang === 'es') return `${a} dividido entre ${b}`;
  if (lang === 'ar') return `${a} مقسوم على ${b}`;
  return `${a} divided by ${b}`;
};

const equalsWord = (lang: AppLang) => {
  if (lang === 'zh-Hans') return '等于';
  if (lang === 'hi') return 'बराबर';
  if (lang === 'es') return 'es igual a';
  if (lang === 'ar') return 'يساوي';
  return 'equals';
};

const equalsWhat = (lang: AppLang) => {
  if (lang === 'zh-Hans') return '等于几';
  if (lang === 'hi') return 'कितने';
  if (lang === 'es') return 'cuánto es';
  if (lang === 'ar') return 'يساوي كم';
  return 'equals what?';
};

export const numberWord = (n: number, lang: AppLang = loadLanguage()): string => wordsUnder100(n, lang);

/** Turn digits and math signs into words for the active language. */
export const normalizeSpeechText = (text: string, lang: AppLang = 'en'): string => {
  const cleaned = text.replace(EMOJI_REGEX, ' ').replace(SYMBOL_REGEX, ' ');
  const num = (raw: string) => wordsUnder100(Number(raw), lang);
  let next = cleaned;
  const pair = (pattern: RegExp, build: (a: string, b: string) => string) => {
    next = next.replace(pattern, (_all, a: string, b: string) => build(num(a), num(b)));
  };
  pair(/(\d+)\s*[−–-]\s*(\d+)/g, (a, b) => minusPhrase(a, b, lang));
  pair(/(\d+)\s*\+\s*(\d+)/g, (a, b) => plusPhrase(a, b, lang));
  pair(/(\d+)\s*[×x]\s*(\d+)/g, (a, b) => timesPhrase(a, b, lang));
  pair(/(\d+)\s*÷\s*(\d+)/g, (a, b) => dividePhrase(a, b, lang));
  next = next.replace(/=\s*\?/g, ` ${equalsWhat(lang)} `);
  next = next.replace(/=/g, ` ${equalsWord(lang)} `);
  next = next.replace(/\d+/g, (raw) => wordsUnder100(Number(raw), lang));
  return next.replace(/\s+/g, ' ').trim();
};

/** Split normalized text into speakable sentences (short gaps between them). */
export const splitSentences = (text: string): string[] => {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(/(?<=[.!?。！？…])\s*|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [trimmed];
};

/** Further split long sentences on commas for slight pauses. */
export const splitClauses = (sentence: string): string[] => {
  const parts = sentence
    .split(/(?<=[,，、;；:])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [sentence.trim()].filter(Boolean);
};

/** BCP-47 style prefixes, most specific first. */
const VOICE_PREFIX: Record<AppLang, string[]> = {
  en: ['en-us', 'en-gb', 'en-au', 'en-ie', 'en'],
  'zh-Hans': ['zh-cn', 'zh-hans', 'zh'],
  hi: ['hi-in', 'hi'],
  es: ['es-us', 'es-mx', 'es-es', 'es'],
  ar: ['ar-sa', 'ar-eg', 'ar'],
};

/** Voices that tend to sound warm and clear for early readers (K–2). */
const FRIENDLY_VOICE = /samantha|karen|moira|tessa|fiona|victoria|veena|lekha|monica|paulina|meijia|mei-jia|ting-ting|sin-ji|aria|jenny|zira|susan|hazel|google us english|google uk english female|google español|microsoft aria|microsoft jenny|microsoft zira|microsoft sabina|microsoft helena|microsoft naayf|xiao.?xiao|yunxia|siri|child|kid|girl/i;

/** Higher-quality synthesis brands/engines when the platform exposes them. */
const QUALITY_VOICE = /natural|neural|premium|enhanced|online|wavenet|studio|superstar|eloquent|siri|google|microsoft/i;

/** Novelty / compact / robotic voices to avoid for lessons. */
const AVOID_VOICE = /espeak|compact|novelty|whisper|evil|zarvox|trinoids|bad news|good news|cellos|organ|bells|boing|bubbles|deranged|hysterical|pipe organ|ralph|albert|bahh|junior|kathy|princess|robot|fred|whisper/i;

export const scoreVoice = (voice: SpeechSynthesisVoice, lang: AppLang): number => {
  const name = voice.name.toLowerCase();
  const langLower = voice.lang.toLowerCase();
  const prefixes = VOICE_PREFIX[lang];
  let score = 0;

  const prefixIndex = prefixes.findIndex((prefix) => langLower.startsWith(prefix));
  if (prefixIndex < 0) return -1000;
  // Prefer earlier (more specific) locale matches.
  score += (prefixes.length - prefixIndex) * 14;

  // Tier: enhanced/premium/neural/online first, then local HQ, then default.
  if (QUALITY_VOICE.test(name)) score += 40;
  if (voice.localService && QUALITY_VOICE.test(name)) score += 8;
  else if (voice.localService) score += 16;
  if (voice.default) score += 3;
  if (FRIENDLY_VOICE.test(name)) score += 22;
  if (AVOID_VOICE.test(name)) score -= 80;
  if (/\bfemale\b|\bwoman\b/i.test(name)) score += 6;
  if (/\bmale\b|\bman\b/i.test(name) && !FRIENDLY_VOICE.test(name)) score -= 4;

  return score;
};

export const listVoicesForLang = (
  lang: AppLang,
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice[] => {
  const prefixes = VOICE_PREFIX[lang];
  return voices
    .filter((voice) => prefixes.some((prefix) => voice.lang.toLowerCase().startsWith(prefix)))
    .sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang));
};

export const pickVoice = (
  lang: AppLang,
  voices: SpeechSynthesisVoice[],
  preferredURI: string | null = preferredVoiceURI,
): SpeechSynthesisVoice | null => {
  const ranked = listVoicesForLang(lang, voices);
  if (ranked.length === 0) return null;
  if (preferredURI) {
    const preferred = ranked.find((voice) => voice.voiceURI === preferredURI);
    if (preferred) return preferred;
  }
  return ranked[0];
};

const primeVoices = () => {
  if (!isSpeechSupported() || voicesPrimed) return;
  const load = () => {
    if (speechSynthesis.getVoices().length > 0) voicesPrimed = true;
  };
  load();
  if (!voicesPrimed) speechSynthesis.addEventListener('voiceschanged', load, { once: true });
};

export const getVoices = (): SpeechSynthesisVoice[] => {
  if (!isSpeechSupported()) return [];
  primeVoices();
  return speechSynthesis.getVoices();
};

export type SpeakResult = 'spoken' | 'muted' | 'unavailable' | 'empty';

export interface SpeakOptions {
  lang?: AppLang;
  onEnd?: () => void;
  onUnavailable?: () => void;
  /** Override persisted rate for one utterance (e.g. sample). */
  ratePref?: SpeechRatePref;
  voiceURI?: string | null;
}

const clearQueueTimers = () => {
  for (const timer of queueTimers) clearTimeout(timer);
  queueTimers = [];
};

const speakChunk = (
  text: string,
  voice: SpeechSynthesisVoice,
  rate: number,
  onEnd?: () => void,
) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.rate = rate;
  utterance.pitch = K2_SPEECH_PITCH;
  const finish = () => onEnd?.();
  utterance.onend = finish;
  utterance.onerror = finish;
  speechSynthesis.speak(utterance);
};

/** Speak normalized text sentence-by-sentence with short gaps. */
const speakNormalized = (
  cleaned: string,
  voice: SpeechSynthesisVoice,
  rate: number,
  onEnd?: () => void,
) => {
  const sentences = splitSentences(cleaned);
  const chunks: string[] = [];
  for (const sentence of sentences) {
    chunks.push(...splitClauses(sentence));
  }
  if (chunks.length === 0) {
    onEnd?.();
    return;
  }

  let index = 0;
  const speakNext = () => {
    if (speechMuted || index >= chunks.length) {
      onEnd?.();
      return;
    }
    const chunk = chunks[index];
    index += 1;
    speakChunk(chunk, voice, rate, () => {
      if (speechMuted || index >= chunks.length) {
        onEnd?.();
        return;
      }
      const prev = chunks[index - 1] ?? '';
      const gap = /[.!?。！？…]$/.test(prev) ? SENTENCE_GAP_MS : CLAUSE_GAP_MS;
      const timer = setTimeout(speakNext, gap);
      queueTimers.push(timer);
    });
  };
  speakNext();
};

export const speak = (text: string, options?: SpeakOptions): SpeakResult => {
  const lang = options?.lang ?? loadLanguage();
  if (speechMuted) {
    options?.onEnd?.();
    return 'muted';
  }
  const cleaned = normalizeSpeechText(text, lang);
  if (!cleaned) {
    options?.onEnd?.();
    return 'empty';
  }
  if (!isSpeechSupported()) {
    options?.onUnavailable?.();
    unavailableHandler?.();
    options?.onEnd?.();
    return 'unavailable';
  }
  primeVoices();
  if (speakTimer) {
    clearTimeout(speakTimer);
    speakTimer = null;
  }
  clearQueueTimers();
  const wasSpeaking = speechSynthesis.speaking || speechSynthesis.pending;
  speechSynthesis.cancel();

  const failUnavailable = () => {
    options?.onUnavailable?.();
    unavailableHandler?.();
    options?.onEnd?.();
  };

  const rate = rateForPref(options?.ratePref ?? speechRatePref);
  const uri = options?.voiceURI !== undefined ? options.voiceURI : preferredVoiceURI;

  const startWithVoices = (voices: SpeechSynthesisVoice[]) => {
    speakTimer = null;
    const voice = pickVoice(lang, voices, uri);
    if (!voice) {
      failUnavailable();
      return;
    }
    speakNormalized(cleaned, voice, rate, options?.onEnd);
  };

  const start = () => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      startWithVoices(voices);
      return;
    }
    // Chrome / some WebViews load voices asynchronously after first use.
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      speechSynthesis.removeEventListener('voiceschanged', onVoices);
      clearTimeout(waitTimer);
      const later = speechSynthesis.getVoices();
      if (later.length === 0) failUnavailable();
      else startWithVoices(later);
    };
    const onVoices = () => finish();
    speechSynthesis.addEventListener('voiceschanged', onVoices);
    const waitTimer = setTimeout(finish, 800);
    speakTimer = waitTimer;
  };

  if (wasSpeaking) speakTimer = setTimeout(start, 40);
  else start();
  return 'spoken';
};

export const stopSpeaking = () => {
  if (speakTimer) {
    clearTimeout(speakTimer);
    speakTimer = null;
  }
  clearQueueTimers();
  if (isSpeechSupported()) speechSynthesis.cancel();
};

/** Short demo line for the Settings voice picker. */
export const sampleSpeechText = (lang: AppLang): string => {
  if (lang === 'zh-Hans') return '你好。我们一起数一数：一，二，三。';
  if (lang === 'hi') return 'नमस्ते। चलो गिनते हैं: एक, दो, तीन।';
  if (lang === 'es') return 'Hola. Contemos juntos: uno, dos, tres.';
  if (lang === 'ar') return 'مرحبًا. لنعد معًا: واحد، اثنان، ثلاثة.';
  return 'Hello. Let’s count together: one, two, three.';
};
