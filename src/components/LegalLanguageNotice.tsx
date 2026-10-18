import React from 'react';
import { useTranslation } from 'react-i18next';

/** Shown on translated legal pages. English remains the authoritative text. */
const LegalLanguageNotice: React.FC = () => {
  const { t, i18n } = useTranslation('legal');
  if (!i18n.language || i18n.language === 'en') return null;
  return (
    <p className="rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100" role="note">
      {t('notice')}
    </p>
  );
};

export default LegalLanguageNotice;
