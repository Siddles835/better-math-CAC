import type { AppLang } from '@/lib/cognition/readingTime';
import { isAppLang } from '@/lib/cognition/readingTime';

export type { AppLang };
export type NumberStyle = 'western' | 'eastern' | 'devanagari';

export const LANG_STORAGE_KEY = 'mathlift.language';

export const LANGUAGE_CHOICES: { id: AppLang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { id: 'en', label: 'English', dir: 'ltr' },
  { id: 'zh-Hans', label: '中文', dir: 'ltr' },
  { id: 'hi', label: 'हिन्दी', dir: 'ltr' },
  { id: 'es', label: 'Español', dir: 'ltr' },
  { id: 'ar', label: 'العربية', dir: 'rtl' },
];

/** Map navigator.languages tags onto the five supported languages. */
export const detectLanguage = (languages: readonly string[]): AppLang => {
  for (const raw of languages) {
    const tag = raw.toLowerCase();
    if (tag.startsWith('zh')) return 'zh-Hans';
    if (tag.startsWith('hi')) return 'hi';
    if (tag.startsWith('es')) return 'es';
    if (tag.startsWith('ar')) return 'ar';
  }
  return 'en';
};

export const loadLanguage = (): AppLang => {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && isAppLang(stored)) return stored;
    const detected = detectLanguage(window.navigator.languages?.length ? window.navigator.languages : [window.navigator.language]);
    window.localStorage.setItem(LANG_STORAGE_KEY, detected);
    return detected;
  } catch {
    return 'en';
  }
};

export const saveLanguage = (lang: AppLang) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* preference still applies this session */
  }
};

export const directionFor = (lang: AppLang): 'ltr' | 'rtl' => (lang === 'ar' ? 'rtl' : 'ltr');

export const applyDocumentLanguage = (lang: AppLang) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = directionFor(lang);
};

/** CLDR-style plural category used by the locale files. */
export const pluralSuffix = (lang: AppLang, count: number): 'zero' | 'one' | 'two' | 'few' | 'many' | 'other' => {
  const n = Math.abs(Math.trunc(count));
  if (lang === 'zh-Hans') return 'other';
  if (lang === 'ar') {
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    const mod = n % 100;
    if (mod >= 3 && mod <= 10) return 'few';
    if (mod >= 11 && mod <= 99) return 'many';
    return 'other';
  }
  return n === 1 ? 'one' : 'other';
};

const EASTERN = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const DEVANAGARI = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/** Display only. Stored and computed values stay Western digits. */
export const formatNumberDisplay = (value: number | string, style: NumberStyle): string => {
  const text = String(value);
  if (style === 'western') return text;
  const map = style === 'eastern' ? EASTERN : DEVANAGARI;
  return text.replace(/\d/g, (digit) => map[Number(digit)] ?? digit);
};

export const numberStylesFor = (lang: AppLang): NumberStyle[] => {
  if (lang === 'ar') return ['western', 'eastern'];
  if (lang === 'hi') return ['western', 'devanagari'];
  return ['western'];
};
