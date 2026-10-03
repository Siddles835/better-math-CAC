import type { AppLang } from '@/lib/cognition/readingTime';
import { loadLanguage } from '@/lib/i18n/language';

const EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

let voicesPrimed = false;
let speakTimer: ReturnType<typeof setTimeout> | null = null;
let speechMuted = false;
let unavailableHandler: (() => void) | null = null;

export const setSpeechMuted = (muted: boolean) => {
  speechMuted = muted;
  if (muted) stopSpeaking();
};

export const isSpeechMuted = () => speechMuted;

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
  const cleaned = text.replace(EMOJI_REGEX, ' ');
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

const VOICE_PREFIX: Record<AppLang, string[]> = {
  en: ['en-us', 'en'],
  'zh-Hans': ['zh-cn', 'zh-hans', 'zh'],
  hi: ['hi-in', 'hi'],
  es: ['es-us', 'es-es', 'es-mx', 'es'],
  ar: ['ar-sa', 'ar'],
};

export const pickVoice = (lang: AppLang, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  const prefixes = VOICE_PREFIX[lang];
  const matching = voices.filter((voice) => prefixes.some((prefix) => voice.lang.toLowerCase().startsWith(prefix)));
  if (matching.length === 0) return null;
  const friendly = /child|kid|samantha|karen|moira|ting|female|girl/i;
  return matching.find((voice) => friendly.test(voice.name)) ?? matching[0];
};

const primeVoices = () => {
  if (!isSpeechSupported() || voicesPrimed) return;
  const load = () => {
    if (speechSynthesis.getVoices().length > 0) voicesPrimed = true;
  };
  load();
  if (!voicesPrimed) speechSynthesis.addEventListener('voiceschanged', load, { once: true });
};

export type SpeakResult = 'spoken' | 'muted' | 'unavailable' | 'empty';

export interface SpeakOptions {
  lang?: AppLang;
  onEnd?: () => void;
  onUnavailable?: () => void;
}

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
  const voice = pickVoice(lang, speechSynthesis.getVoices());
  if (!voice) {
    options?.onUnavailable?.();
    unavailableHandler?.();
    options?.onEnd?.();
    return 'unavailable';
  }
  if (speakTimer) {
    clearTimeout(speakTimer);
    speakTimer = null;
  }
  const wasSpeaking = speechSynthesis.speaking || speechSynthesis.pending;
  speechSynthesis.cancel();
  const start = () => {
    speakTimer = null;
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = voice.lang;
    utterance.voice = voice;
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    const finish = () => options?.onEnd?.();
    utterance.onend = finish;
    utterance.onerror = finish;
    speechSynthesis.speak(utterance);
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
  if (isSpeechSupported()) speechSynthesis.cancel();
};
