import React from 'react';
import { useTranslation } from 'react-i18next';
import { isAppLang } from '@/lib/cognition/readingTime';
import {
  applyDocumentLanguage,
  LANGUAGE_CHOICES,
  numberStylesFor,
  saveLanguage,
  type AppLang,
} from '@/lib/i18n/language';
import { useAccessibility } from '@/context/AccessibilityContext';
import { loadLanguageFont } from '@/i18n/setup';

/** Native-script names. Switching does not reload and does not touch lesson progress. */
const LanguagePicker: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { i18n, t } = useTranslation('common');
  const { prefs, setPref } = useAccessibility();
  const current: AppLang = isAppLang(i18n.language) ? i18n.language : 'en';

  const choose = (lang: AppLang) => {
    saveLanguage(lang);
    applyDocumentLanguage(lang);
    void loadLanguageFont(lang);
    void i18n.changeLanguage(lang);
    if (!numberStylesFor(lang).includes(prefs.numberStyle)) {
      setPref('numberStyle', 'western');
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="group" aria-label={t('language')}>
      {LANGUAGE_CHOICES.map((choice) => {
        const selected = current === choice.id;
        return (
          <button
            key={choice.id}
            type="button"
            lang={choice.id}
            dir={choice.dir}
            aria-pressed={selected}
            onClick={() => choose(choice.id)}
            className={`min-h-11 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              selected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:bg-muted'
            }`}
          >
            {choice.label}
          </button>
        );
      })}
    </div>
  );
};

export default LanguagePicker;
