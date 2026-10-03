import i18n from '@/i18n/setup';

/** Translate at render time. App subscribes to language changes so the tree updates. */
export const tx = (key: string, values?: Record<string, unknown>): string =>
  i18n.t(key, values);
