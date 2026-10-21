import type { AppLang } from '@/lib/cognition/readingTime';
import { loadLanguage } from '@/lib/i18n/language';
import { prepareClearPlayback, unlockSpeechClarity } from '@/lib/speechClarity';

const EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
/** Strip leftover symbols that should not be spoken (keep / until fractions are handled). */
const SYMBOL_REGEX = /[★☆✔✗✕•◆►◀←→↑↓©®™#*_~`|\\<>[\]{}]/g;

let voicesPrimed = false;
let speakTimer: ReturnType<typeof setTimeout> | null = null;
let queueTimers: ReturnType<typeof setTimeout>[] = [];
let speechMuted = false;
let preferredVoiceURI: string | null = null;
let speechRatePref: SpeechRatePref = 'normal';
let unavailableHandler: (() => void) | null = null;
/** Bumps on every speak/stop so stale utterance callbacks do nothing. */
let speechToken = 0;
let naturalVoicePref = true;
/**
 * When true (default), every speak() uses OpenAI Cedar only —
 * no Kokoro, no device SpeechSynthesis, no pre-rendered clips.
 */
let alloyOnlyPref = true;

export type SpeechRatePref = 'slow' | 'normal';

/**
 * Everyday classroom pace — a hair under 1.0 so device voices stay clear.
 * Pitch stays at 1.0 (higher sounds cartoonish).
 */
export const K2_SPEECH_RATE = 0.92;
export const K2_SPEECH_RATE_SLOW = 0.8;
export const K2_SPEECH_PITCH = 1;
/** Tiny gap only when a long passage must be split. */
export const SENTENCE_GAP_MS = 110;
/** Prefer one utterance; Chrome can cut off much longer strings. */
export const LONG_CHUNK_CHARS = 280;

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

export const setNaturalVoicePref = (enabled: boolean) => {
  naturalVoicePref = enabled;
  if (enabled) {
    void import('./speechOpenAI').then(({ ensureCloudTtsAvailable }) => {
      void ensureCloudTtsAvailable();
    });
  }
  void import('./speechNeural').then(({ setNaturalVoiceEnabled, ensureNeuralReady }) => {
    setNaturalVoiceEnabled(enabled);
    if (enabled) void ensureNeuralReady();
  });
};

export const getNaturalVoicePref = (): boolean => naturalVoicePref;

/** Product default: OpenAI Cedar (natural male) for all read-aloud. */
export const setAlloyOnlyPref = (enabled: boolean) => {
  alloyOnlyPref = enabled;
  if (enabled) {
    preferredVoiceURI = null;
    void import('./speechOpenAI').then(({ ensureCloudTtsAvailable, setPreferredCloudVoice }) => {
      setPreferredCloudVoice('cedar');
      void ensureCloudTtsAvailable();
    });
  }
};

export const getAlloyOnlyPref = (): boolean => alloyOnlyPref;

export const rateForPref = (pref: SpeechRatePref = speechRatePref): number =>
  pref === 'slow' ? K2_SPEECH_RATE_SLOW : K2_SPEECH_RATE;

export const isSpeechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** True when any voice playback path can run (Alloy HTMLAudio or device TTS). */
export const isVoicePlaybackAvailable = () => typeof window !== 'undefined';

export const setSpeechUnavailableHandler = (handler: (() => void) | null) => {
  unavailableHandler = handler;
};

const EN = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const ES = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
];
const ES_TENS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const ES_VEINTI = [
  '', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco',
  'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
];

/** Full 0 to 100 Hindi table (21 to 99 are irregular). */
const HI_0_100 = [
  'शून्य', 'एक', 'दो', 'तीन', 'चार', 'पांच', 'छह', 'सात', 'आठ', 'नौ', 'दस',
  'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस', 'बीस',
  'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस', 'तीस',
  'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस', 'चालीस',
  'इकतालीस', 'बयालीस', 'तैंतालीस', 'चौवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास', 'पचास',
  'इक्यावन', 'बावन', 'तिरपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ', 'साठ',
  'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर', 'सत्तर',
  'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी', 'अस्सी',
  'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सतासी', 'अठासी', 'नवासी', 'नब्बे',
  'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पंचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे', 'सौ',
];

const AR = [
  'صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
  'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر',
];
const AR_TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const ZH = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

const wordsUnder100 = (n: number, lang: AppLang): string => {
  const value = Math.trunc(n);
  if (value < 0 || value > 100) return String(value);
  if (lang === 'hi') return HI_0_100[value];
  if (value === 100) {
    if (lang === 'zh-Hans') return '一百';
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
    if (lang === 'ar') return AR[value];
    return EN[value];
  }
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  if (lang === 'es') {
    if (value === 20) return 'veinte';
    if (value < 30) return ES_VEINTI[ones];
    return ones === 0 ? ES_TENS[tens] : `${ES_TENS[tens]} y ${ES[ones]}`;
  }
  if (lang === 'ar') return ones === 0 ? AR_TENS[tens] : `${AR[ones]} و${AR_TENS[tens]}`;
  return ones === 0 ? EN_TENS[tens] : `${EN_TENS[tens]}-${EN[ones]}`;
};

const wordsUpTo9999 = (n: number, lang: AppLang): string => {
  const value = Math.trunc(n);
  if (!Number.isFinite(value) || value < 0) return String(n);
  if (value > 9999) return String(value);
  if (value <= 100) return wordsUnder100(value, lang);

  if (lang === 'zh-Hans') {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    const hundreds = Math.floor(rest / 100);
    const under = rest % 100;
    let out = '';
    if (thousands > 0) out += `${ZH[thousands]}千`;
    if (hundreds > 0) out += `${ZH[hundreds]}百`;
    else if (thousands > 0 && under > 0) out += '零';
    if (under > 0) {
      if (hundreds > 0 && under < 10) out += '零';
      out += wordsUnder100(under, lang);
    }
    return out;
  }

  if (lang === 'hi') {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    const hundreds = Math.floor(rest / 100);
    const under = rest % 100;
    const parts: string[] = [];
    if (thousands > 0) parts.push(`${wordsUnder100(thousands, lang)} हजार`);
    if (hundreds > 0) parts.push(`${wordsUnder100(hundreds, lang)} सौ`);
    if (under > 0) parts.push(wordsUnder100(under, lang));
    return parts.join(' ');
  }

  if (lang === 'es') {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    const hundreds = Math.floor(rest / 100);
    const under = rest % 100;
    const parts: string[] = [];
    if (thousands === 1) parts.push('mil');
    else if (thousands > 1) parts.push(`${wordsUnder100(thousands, lang)} mil`);
    if (hundreds === 1) parts.push(under === 0 ? 'cien' : 'ciento');
    else if (hundreds > 1) {
      const names = ['', '', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
      parts.push(names[hundreds]);
    }
    if (under > 0) parts.push(wordsUnder100(under, lang));
    return parts.join(' ');
  }

  if (lang === 'ar') {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    const hundreds = Math.floor(rest / 100);
    const under = rest % 100;
    const parts: string[] = [];
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands > 2) parts.push(`${wordsUnder100(thousands, lang)} آلاف`);
    if (hundreds === 1) parts.push('مئة');
    else if (hundreds === 2) parts.push('مئتان');
    else if (hundreds > 2) parts.push(`${AR[hundreds]} مئة`);
    if (under > 0) parts.push(wordsUnder100(under, lang));
    return parts.join(' ');
  }

  const thousands = Math.floor(value / 1000);
  const rest = value % 1000;
  const hundreds = Math.floor(rest / 100);
  const under = rest % 100;
  const parts: string[] = [];
  if (thousands > 0) parts.push(`${wordsUnder100(thousands, lang)} thousand`);
  if (hundreds > 0) parts.push(`${EN[hundreds]} hundred`);
  if (under > 0) parts.push(wordsUnder100(under, lang));
  return parts.join(' ');
};

const toPhrase = (a: string, b: string, lang: AppLang) => {
  if (lang === 'zh-Hans') return `${a}到${b}`;
  if (lang === 'hi') return `${a} से ${b}`;
  if (lang === 'es') return `${a} a ${b}`;
  if (lang === 'ar') return `${a} إلى ${b}`;
  return `${a} to ${b}`;
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

const pointWord = (lang: AppLang) => {
  if (lang === 'zh-Hans') return '点';
  if (lang === 'hi') return 'दशमलव';
  if (lang === 'es') return 'punto';
  if (lang === 'ar') return 'فاصلة';
  return 'point';
};

const slashWord = (lang: AppLang) => {
  if (lang === 'zh-Hans') return '斜杠';
  if (lang === 'hi') return 'स्लैश';
  if (lang === 'es') return 'barra';
  if (lang === 'ar') return 'شرطة مائلة';
  return 'slash';
};

const fractionPhrase = (a: string, b: string, lang: AppLang) => {
  if (a === wordsUpTo9999(1, lang) && b === wordsUpTo9999(2, lang)) {
    if (lang === 'zh-Hans') return '二分之一';
    if (lang === 'hi') return 'आधा';
    if (lang === 'es') return 'un medio';
    if (lang === 'ar') return 'نصف';
    return 'one half';
  }
  if (lang === 'zh-Hans') return `${a}${slashWord(lang)}${b}`;
  if (lang === 'hi') return `${a} बटे ${b}`;
  if (lang === 'es') return `${a} sobre ${b}`;
  if (lang === 'ar') return `${a} على ${b}`;
  return `${a} over ${b}`;
};

const equalsWord = (lang: AppLang) => {
  if (lang === 'zh-Hans') return '等于';
  if (lang === 'hi') return 'बराबर';
  if (lang === 'es') return 'es igual a';
  if (lang === 'ar') return 'يساوي';
  // "is" sounds like normal speech; "equals" sounds like a textbook.
  return 'is';
};

const equalsWhat = (lang: AppLang) => {
  if (lang === 'zh-Hans') return '等于几';
  if (lang === 'hi') return 'कितने';
  if (lang === 'es') return 'cuánto es';
  if (lang === 'ar') return 'يساوي كم';
  // How a person asks, not "equals what".
  return 'what is that';
};

export const numberWord = (n: number, lang: AppLang = loadLanguage()): string => wordsUpTo9999(n, lang);

/** Turn digits and math signs into words for the active language. */
export const normalizeSpeechText = (text: string, lang: AppLang = 'en'): string => {
  const cleaned = text.replace(EMOJI_REGEX, ' ');
  const num = (raw: string) => wordsUpTo9999(Number(raw), lang);
  let next = cleaned;

  // Decimals before any period-based sentence logic.
  next = next.replace(/(\d+)\.(\d+)/g, (_all, whole: string, frac: string) => {
    const digits = frac.split('').map((d) => wordsUpTo9999(Number(d), lang)).join(' ');
    return `${num(whole)} ${pointWord(lang)} ${digits}`;
  });

  // Fractions before stripping slashes.
  next = next.replace(/(\d+)\s*\/\s*(\d+)/g, (_all, a: string, b: string) =>
    fractionPhrase(num(a), num(b), lang)
  );

  next = next.replace(SYMBOL_REGEX, ' ');

  const pair = (pattern: RegExp, build: (a: string, b: string) => string) => {
    next = next.replace(pattern, (_all, a: string, b: string) => build(num(a), num(b)));
  };

  // En dash / em dash ranges: "12–20" -> "twelve to twenty"
  pair(/(\d+)\s*[–—]\s*(\d+)/g, (a, b) => toPhrase(a, b, lang));
  // Hyphen between digits with no spaces: treat as a range, not subtraction.
  pair(/(\d+)-(\d+)/g, (a, b) => toPhrase(a, b, lang));
  // Clear subtraction: unicode minus, or hyphen/minus with spaces.
  pair(/(\d+)\s+[−-]\s+(\d+)/g, (a, b) => minusPhrase(a, b, lang));
  pair(/(\d+)\s*−\s*(\d+)/g, (a, b) => minusPhrase(a, b, lang));

  pair(/(\d+)\s*\+\s*(\d+)/g, (a, b) => plusPhrase(a, b, lang));
  pair(/(\d+)\s*[×x]\s*(\d+)/g, (a, b) => timesPhrase(a, b, lang));
  pair(/(\d+)\s*÷\s*(\d+)/g, (a, b) => dividePhrase(a, b, lang));
  next = next.replace(/=\s*\?/g, ` ${equalsWhat(lang)} `);
  next = next.replace(/=/g, ` ${equalsWord(lang)} `);
  next = next.replace(/\d+/g, (raw) => wordsUpTo9999(Number(raw), lang));
  return next.replace(/\s+/g, ' ').trim();
};

/** Split normalized text into speakable sentences (short gaps between them). */
export const splitSentences = (text: string): string[] => {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return [];
  // Do not treat a period between digits as a sentence end (decimals already expanded).
  const parts = trimmed
    .split(/(?<=[.!?。！？…])(?!\d)\s*|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [trimmed];
};

/**
 * Only split further when a sentence is long enough to risk Chrome's utterance cutoff.
 * Do not split on every comma (that resets intonation).
 */
export const splitLongChunk = (sentence: string, maxChars = LONG_CHUNK_CHARS): string[] => {
  const trimmed = sentence.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];
  const words = trimmed.split(/\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

/**
 * Pack speech into as few utterances as possible. Short multi-sentence lines
 * stay in one utterance so the voice does not reset on every period.
 */
export const packSpeechChunks = (text: string, maxChars = LONG_CHUNK_CHARS): string[] => {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];

  const sentences = splitSentences(trimmed);
  const packed: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const pieces = splitLongChunk(sentence, maxChars);
    for (const piece of pieces) {
      const next = current ? `${current} ${piece}` : piece;
      if (next.length > maxChars && current) {
        packed.push(current);
        current = piece;
      } else {
        current = next;
      }
    }
  }
  if (current) packed.push(current);
  return packed;
};

/**
 * Keep normal punctuation. Replacing periods with commas made voices sound flat.
 * Packing into one utterance is enough for continuity.
 */
export const smoothProsodyText = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** @deprecated Prefer splitLongChunk; kept for callers that still import it. */
export const splitClauses = (sentence: string): string[] => splitLongChunk(sentence);

/** BCP-47 style prefixes, most specific first. */
const VOICE_PREFIX: Record<AppLang, string[]> = {
  en: ['en-us', 'en-gb', 'en-au', 'en-ie', 'en'],
  'zh-Hans': ['zh-cn', 'zh-hans', 'zh'],
  hi: ['hi-in', 'hi'],
  es: ['es-us', 'es-mx', 'es-es', 'es'],
  ar: ['ar-sa', 'ar-eg', 'ar'],
};

/** Voices that tend to sound warm and clear for early readers (K–2). Prefer US names. */
const FRIENDLY_VOICE =
  /samantha|susan|zira|jenny|aria|google us english|microsoft aria|microsoft jenny|microsoft zira|siri|veena|lekha|monica|paulina|meijia|mei-jia|ting-ting|sin-ji|microsoft sabina|xiao.?xiao|yunxia|child|kid|girl/i;

/** British / Commonwealth voices — deprioritize when English fallback is used. */
const NON_US_ENGLISH_VOICE =
  /en-gb|en-au|en-ie|en-in|en-za|british|uk english|daniel|serena|martha|kate|moira|tessa|fiona|karen|hazel|google uk|microsoft helena|australian|irish|scottish/i;

/** High-quality neural / enhanced labels only (not every Google/Microsoft voice). */
const QUALITY_VOICE =
  /premium|enhanced|natural|neural|siri|microsoft online|\(natural\)|online \(natural\)|wavenet|studio|superstar|eloquent|google.*neural|neural2/i;

/** Strongly human-sounding cloud or enhanced voices when the OS exposes them. */
const HUMAN_VOICE =
  /online \(natural\)|microsoft .* online|premium|enhanced|neural|siri|wavenet|studio/i;

/** Novelty / compact / robotic voices to avoid for lessons. */
const AVOID_VOICE =
  /espeak|compact|novelty|whisper|evil|zarvox|trinoids|bad news|good news|cellos|organ|bells|boing|bubbles|deranged|hysterical|pipe organ|ralph|albert|bahh|junior|kathy|princess|robot|fred/i;

export type VoiceQuality = 'natural' | 'standard';

export const voiceQuality = (voice: SpeechSynthesisVoice): VoiceQuality =>
  QUALITY_VOICE.test(voice.name) ? 'natural' : 'standard';

export const scoreVoice = (voice: SpeechSynthesisVoice, lang: AppLang): number => {
  const name = voice.name.toLowerCase();
  const langLower = voice.lang.toLowerCase();
  const prefixes = VOICE_PREFIX[lang];
  let score = 0;

  const prefixIndex = prefixes.findIndex((prefix) => langLower.startsWith(prefix));
  if (prefixIndex < 0) return -1000;
  score += (prefixes.length - prefixIndex) * 14;

  // English lessons: strongly prefer male US voices when cloud TTS is unavailable.
  if (lang === 'en') {
    if (langLower.startsWith('en-us')) score += 40;
    else if (NON_US_ENGLISH_VOICE.test(`${name} ${langLower}`)) score -= 50;
    if (/\b(david|guy|aaron|alex|bruce|tom|mark|james|google us english male)\b/i.test(name)) {
      score += 28;
    }
    if (/\bfemale\b|\bwoman\b|samantha|zira|susan|karen|moira|jenny|aria/i.test(name)) {
      score -= 20;
    }
  }

  const quality = voiceQuality(voice);
  if (HUMAN_VOICE.test(name)) score += 80;
  else if (quality === 'natural') score += 55;
  // Prefer remote Natural voices over flat local ones when both exist.
  if (!voice.localService && HUMAN_VOICE.test(name)) score += 20;
  else if (voice.localService && quality === 'natural') score += 8;
  else if (voice.localService) score += 2;
  if (voice.default) score += 2;
  if (FRIENDLY_VOICE.test(name) && lang !== 'en') score += 18;
  if (AVOID_VOICE.test(name)) score -= 100;
  if (lang !== 'en' && /\bfemale\b|\bwoman\b/i.test(name)) score += 6;
  if (lang === 'en' && /\bmale\b|\bman\b/i.test(name)) score += 10;
  if (lang !== 'en' && /\bmale\b|\bman\b/i.test(name) && !FRIENDLY_VOICE.test(name)) score -= 4;

  return score;
};

/** True when this OS voice is labeled Natural / Neural / Online / Siri-class. */
export const isOsNaturalVoice = (voice: SpeechSynthesisVoice): boolean =>
  HUMAN_VOICE.test(voice.name) || voiceQuality(voice) === 'natural';

/** When a human-quality voice exists for the language, ignore flat robotic ones. */
export const pickHumanVoice = (
  lang: AppLang,
  voices: SpeechSynthesisVoice[],
  preferredURI: string | null = preferredVoiceURI
): SpeechSynthesisVoice | null => {
  const ranked = listVoicesForLang(lang, voices);
  if (ranked.length === 0) return null;
  if (preferredURI) {
    const preferred = ranked.find((voice) => voice.voiceURI === preferredURI);
    if (preferred && isOsNaturalVoice(preferred)) {
      return preferred;
    }
  }
  const human = ranked.find((voice) => isOsNaturalVoice(voice));
  return human ?? ranked[0];
};

/** Best OS Natural/Neural voice for this language, if any. */
export const findOsNaturalVoice = (
  lang: AppLang,
  voices: SpeechSynthesisVoice[] = getVoices(),
  preferredURI: string | null = preferredVoiceURI
): SpeechSynthesisVoice | null => {
  const picked = pickHumanVoice(lang, voices, preferredURI);
  if (picked && isOsNaturalVoice(picked)) return picked;
  return null;
};

export const listVoicesForLang = (
  lang: AppLang,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice[] => {
  const prefixes = VOICE_PREFIX[lang];
  return voices
    .filter((voice) => prefixes.some((prefix) => voice.lang.toLowerCase().startsWith(prefix)))
    .sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang));
};

export const pickVoice = (
  lang: AppLang,
  voices: SpeechSynthesisVoice[],
  preferredURI: string | null = preferredVoiceURI
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
  /** Override cloud OpenAI voice for one utterance (e.g. Settings sample). */
  cloudVoice?: string | null;
  /**
   * Force the device SpeechSynthesis path (skip OpenAI / Kokoro).
   * Used when the user samples a specific installed voice in Settings.
   */
  preferDevice?: boolean;
}

const clearQueueTimers = () => {
  for (const timer of queueTimers) clearTimeout(timer);
  queueTimers = [];
};

let activeAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;
let manifestPromise: Promise<Record<string, { file: string; duration?: number }> | null> | null = null;
let manifestCache: Record<string, { file: string; duration?: number }> | null | undefined;

/** Unlock HTMLAudioElement playback on the first user gesture (iOS/WKWebView). */
export const unlockAudio = () => {
  if (audioUnlocked || typeof window === 'undefined') return;
  audioUnlocked = true;
  try {
    unlockSpeechClarity();
    const silent = new Audio();
    silent.src =
      'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4OjE2LjEwMAAAAAAAAAAAAAAAAC1FWERTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+1DEAAADAAAhHgAADUQAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    void silent.play().catch(() => undefined);
  } catch {
    // ignore
  }
};

if (typeof window !== 'undefined') {
  const once = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', once);
    window.removeEventListener('keydown', once);
  };
  window.addEventListener('pointerdown', once, { once: true });
  window.addEventListener('keydown', once, { once: true });
}

const loadManifest = async () => {
  if (manifestCache !== undefined) return manifestCache;
  if (!manifestPromise) {
    manifestPromise = fetch('/audio/manifest.json')
      .then(async (response) => {
        if (!response.ok) {
          manifestCache = null;
          return null;
        }
        const data = (await response.json()) as Record<string, { file: string; duration?: number }>;
        manifestCache = data && Object.keys(data).length > 0 ? data : null;
        return manifestCache;
      })
      .catch(() => {
        manifestCache = null;
        return null;
      });
  }
  return manifestPromise;
};

const manifestHasClips = (): boolean =>
  !!manifestCache && Object.keys(manifestCache).length > 0;

/** Warm the audio manifest early so speak() can skip a network wait. */
export const prefetchSpeechManifest = (): void => {
  void loadManifest();
};

/** SHA-1 style hex via SubtleCrypto when available; sync fallback for tests/SSR. */
export const hashSpeechKey = async (
  lang: string,
  voice: string,
  rate: number,
  normalized: string
): Promise<string> => {
  const payload = `${lang}|${voice}|${rate}|${normalized}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest('SHA-1', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Simple non-crypto fallback for unit tests without SubtleCrypto.
  let h = 2166136261;
  for (const ch of payload) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
};

const playPreRendered = async (
  lang: AppLang,
  normalized: string,
  ratePref: SpeechRatePref,
  token: number,
  onEnd?: () => void
): Promise<boolean> => {
  const manifest = await loadManifest();
  if (!manifest || speechMuted || token !== speechToken) return false;
  const voice = 'chirp3';
  const rate = 0.9;
  const key = await hashSpeechKey(lang, voice, rate, normalized);
  const entry = manifest[key];
  if (!entry?.file) return false;
  return await new Promise<boolean>((resolve) => {
    if (token !== speechToken) {
      resolve(false);
      return;
    }
    try {
      unlockAudio();
      if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
      }
      const audio = new Audio(entry.file.startsWith('/') ? entry.file : `/audio/${entry.file}`);
      activeAudio = audio;
      unlockSpeechClarity();
      prepareClearPlayback(audio);
      audio.preservesPitch = true;
      // Prefer server-side rate when possible; keep a gentle slowdown only for clips.
      audio.playbackRate = ratePref === 'slow' ? 0.85 : 1;
      const finish = (ok: boolean) => {
        if (token !== speechToken) {
          resolve(false);
          return;
        }
        if (activeAudio === audio) activeAudio = null;
        if (ok) onEnd?.();
        resolve(ok);
      };
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      void audio.play().then(
        () => undefined,
        () => finish(false)
      );
    } catch {
      resolve(false);
    }
  });
};

const speakChunk = (
  text: string,
  voice: SpeechSynthesisVoice,
  rate: number,
  token: number,
  onEnd?: () => void
) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.rate = rate;
  utterance.pitch = K2_SPEECH_PITCH;
  const finish = (event?: SpeechSynthesisErrorEvent) => {
    if (token !== speechToken) return;
    if (event && (event.error === 'interrupted' || event.error === 'canceled')) return;
    onEnd?.();
  };
  utterance.onend = () => finish();
  utterance.onerror = (event) => finish(event);
  speechSynthesis.speak(utterance);
};

/** Speak in as few utterances as possible for smoother intonation. */
const speakNormalized = (
  cleaned: string,
  voice: SpeechSynthesisVoice,
  rate: number,
  token: number,
  onEnd?: () => void
) => {
  const chunks = packSpeechChunks(smoothProsodyText(cleaned));
  if (chunks.length === 0) {
    if (token === speechToken) onEnd?.();
    return;
  }

  let index = 0;
  const speakNext = () => {
    if (token !== speechToken || speechMuted || index >= chunks.length) {
      if (token === speechToken) onEnd?.();
      return;
    }
    const chunk = chunks[index];
    index += 1;
    speakChunk(chunk, voice, rate, token, () => {
      if (token !== speechToken || speechMuted || index >= chunks.length) {
        if (token === speechToken) onEnd?.();
        return;
      }
      const timer = setTimeout(speakNext, SENTENCE_GAP_MS);
      queueTimers.push(timer);
    });
  };
  speakNext();
};

const speakDevice = (
  cleaned: string,
  lang: AppLang,
  options: SpeakOptions | undefined,
  token: number
): SpeakResult => {
  if (!isSpeechSupported()) {
    if (token === speechToken) {
      options?.onUnavailable?.();
      unavailableHandler?.();
      options?.onEnd?.();
    }
    return 'unavailable';
  }
  primeVoices();
  const failUnavailable = () => {
    if (token !== speechToken) return;
    options?.onUnavailable?.();
    unavailableHandler?.();
    options?.onEnd?.();
  };

  const rate = rateForPref(options?.ratePref ?? speechRatePref);
  const uri = options?.voiceURI !== undefined ? options.voiceURI : preferredVoiceURI;

  const startWithVoices = (voices: SpeechSynthesisVoice[]) => {
    if (token !== speechToken) return;
    speakTimer = null;
    // When warm voice is on, prefer OS Natural/Neural voices over flat locals.
    const voice = naturalVoicePref
      ? pickHumanVoice(lang, voices, uri)
      : pickVoice(lang, voices, uri);
    if (!voice) {
      failUnavailable();
      return;
    }
    speakNormalized(cleaned, voice, rate, token, options?.onEnd);
  };

  const start = () => {
    if (token !== speechToken) return;
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      startWithVoices(voices);
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled || token !== speechToken) return;
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

  const wasSpeaking = speechSynthesis.speaking || speechSynthesis.pending;
  speechSynthesis.cancel();
  if (wasSpeaking) speakTimer = setTimeout(start, 40);
  else start();
  return 'spoken';
};

export const speak = (text: string, options?: SpeakOptions): SpeakResult => {
  const lang = options?.lang ?? loadLanguage();
  speechToken += 1;
  const token = speechToken;
  if (speakTimer) {
    clearTimeout(speakTimer);
    speakTimer = null;
  }
  clearQueueTimers();
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  if (isSpeechSupported()) speechSynthesis.cancel();

  if (speechMuted) {
    options?.onEnd?.();
    return 'muted';
  }
  const cleaned = normalizeSpeechText(text, lang);
  if (!cleaned) {
    options?.onEnd?.();
    return 'empty';
  }

  const ratePref = options?.ratePref ?? speechRatePref;

  const startDevice = () => {
    if (token !== speechToken) return;
    if (!isSpeechSupported()) {
      options?.onUnavailable?.();
      unavailableHandler?.();
      options?.onEnd?.();
      return;
    }
    speakDevice(cleaned, lang, options, token);
  };

  const afterClip = async () => {
    if (token !== speechToken) return;
    // Explicit device-only sample (legacy Settings backups). Skipped in Alloy-only mode.
    if (options?.preferDevice && !alloyOnlyPref) {
      startDevice();
      return;
    }

    // Prefer OpenAI Alloy for every lesson / read-aloud / animation narration.
    try {
      const {
        speakWithOpenAI,
        ensureCloudTtsAvailable,
        DEFAULT_CLOUD_VOICE,
      } = await import('./speechOpenAI');
      if (await ensureCloudTtsAvailable({ retry: true })) {
        const playedCloud = await speakWithOpenAI(cleaned, {
          token,
          isCurrent: (value) => value === speechToken,
          ratePref,
          voice: DEFAULT_CLOUD_VOICE,
          onEnd: options?.onEnd,
          bindAudio: (audio) => {
            activeAudio = audio;
          },
        });
        if (playedCloud || token !== speechToken) return;
      }
    } catch {
      // fall through to device so read-aloud never bricks
    }

    // Alloy preferred: if cloud TTS is down, still speak with the best device voice
    // so students are not stuck on “Read aloud isn't available”.
    if (alloyOnlyPref) {
      startDevice();
      return;
    }

    if (naturalVoicePref && lang === 'en') {
      const uri = options?.voiceURI !== undefined ? options.voiceURI : preferredVoiceURI;
      const osNatural = findOsNaturalVoice(lang, getVoices(), uri);
      if (osNatural) {
        startDevice();
        return;
      }
      try {
        const { speakWithNeural, getNeuralStatus, ensureNeuralReady } = await import('./speechNeural');
        if (getNeuralStatus() !== 'ready') void ensureNeuralReady();
        const played = await speakWithNeural(text, {
          token,
          isCurrent: (value) => value === speechToken,
          ratePref,
          onEnd: options?.onEnd,
          bindAudio: (audio) => {
            activeAudio = audio;
          },
          waitForModel: true,
        });
        if (played || token !== speechToken) return;
      } catch {
        // fall through to device voice
      }
    }
    startDevice();
  };

  // Pre-rendered clips are a different voice — skip them when Alloy is selected.
  if (!alloyOnlyPref && manifestHasClips()) {
    void playPreRendered(lang, cleaned, ratePref, token, options?.onEnd).then((played) => {
      if (played || token !== speechToken) return;
      void afterClip();
    });
    return 'spoken';
  }

  if (manifestCache === undefined) void loadManifest();
  void afterClip();
  return 'spoken';
};

export const stopSpeaking = (options?: { skipAlloySample?: boolean }) => {
  speechToken += 1;
  if (speakTimer) {
    clearTimeout(speakTimer);
    speakTimer = null;
  }
  clearQueueTimers();
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  if (isSpeechSupported()) speechSynthesis.cancel();
  // Do not async-stop Alloy here when Settings is about to start a new sample —
  // the late import callback would kill playback right after it begins.
  if (!options?.skipAlloySample) {
    void import('./speechOpenAI').then(({ stopAlloyReferenceSample }) => {
      stopAlloyReferenceSample();
    });
  }
};

/** Short demo line for the Settings voice picker. */
export const sampleSpeechText = (lang: AppLang): string => {
  if (lang === 'zh-Hans') return '你好。我们一起数一数。一，二，三。';
  if (lang === 'hi') return 'नमस्ते। चलो गिनते हैं। एक, दो, तीन।';
  if (lang === 'es') return 'Hola. Contemos juntos. Uno, dos, tres.';
  if (lang === 'ar') return 'مرحبًا. لنعد معًا. واحد، اثنان، ثلاثة.';
  return 'Hi there. Let’s count together. One, two, three.';
};
