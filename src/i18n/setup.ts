import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { isAppLang } from '@/lib/cognition/readingTime';
import { applyDocumentLanguage, loadLanguage, type AppLang } from '@/lib/i18n/language';

const modules = import.meta.glob('../locales/*/*.json', { eager: true });

const resources: Record<string, Record<string, object>> = {};
for (const [path, mod] of Object.entries(modules)) {
  const match = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const lang = match[1];
  const ns = match[2];
  resources[lang] ??= {};
  const loaded = mod as { default?: object };
  resources[lang][ns] = loaded.default ?? (mod as object);
}

export const loadLanguageFont = (lang: AppLang) => {
  if (lang === 'zh-Hans') {
    void import('@fontsource/noto-sans-sc/chinese-simplified-400.css');
  } else if (lang === 'hi') {
    void import('@fontsource/noto-sans-devanagari/devanagari-400.css');
  } else if (lang === 'ar') {
    void import('@fontsource/noto-sans-arabic/arabic-400.css');
    void import('@fontsource/noto-sans-arabic/latin-400.css');
  }
};

const initial: AppLang = typeof window === 'undefined' ? 'en' : loadLanguage();

void i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: 'en',
  supportedLngs: ['en', 'zh-Hans', 'hi', 'es', 'ar'],
  ns: ['common', 'home', 'lessons', 'quiz', 'teacher', 'cognition', 'settings', 'methods', 'legal', 'ui', 'explore', 'paths'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

const active = isAppLang(initial) ? initial : 'en';
applyDocumentLanguage(active);
void loadLanguageFont(active);

export default i18n;
