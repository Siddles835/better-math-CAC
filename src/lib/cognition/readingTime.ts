/**
 * Reading-time multipliers for timing features.
 *
 * These are assumptions, not measured classroom values. A 6-year-old's time
 * to start includes reading the prompt. Arabic and Hindi prompts take longer
 * to decode than English. Chinese prompts are shorter. Dividing observed
 * timeToFirst and avgGap by the multiplier keeps the misconception tree
 * language-independent, so COUNT_ALL and WORD_GAP are not triggered just
 * because the script takes longer to read.
 */
export const APP_LANGS = ['en', 'zh-Hans', 'hi', 'es', 'ar'] as const;
export type AppLang = (typeof APP_LANGS)[number];

export const READING_TIME_MULTIPLIER: Record<AppLang, number> = {
  en: 1,
  'zh-Hans': 0.82,
  hi: 1.3,
  es: 1.18,
  ar: 1.35,
};

export const isAppLang = (value: string): value is AppLang =>
  (APP_LANGS as readonly string[]).includes(value);

export const normalizeReadingSeconds = (seconds: number, lang: string): number => {
  const multiplier = isAppLang(lang) ? READING_TIME_MULTIPLIER[lang] : 1;
  if (!Number.isFinite(seconds) || multiplier <= 0) return 0;
  return seconds / multiplier;
};
