import { tx } from '@/i18n/tx';
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteChrome from '@/components/SiteChrome';
import LegalLanguageNotice from '@/components/LegalLanguageNotice';

const SUPPORT_EMAIL = 'mathlift1234@gmail.com';

const SupportPage: React.FC = () => {
  const { t, i18n } = useTranslation('legal');
  return (
    <SiteChrome>
      <LegalLanguageNotice />
      {i18n.language !== 'en' && (
        <p className="text-[15px] leading-relaxed text-muted-foreground mb-6">{t('supportLead')}</p>
      )}
      <h1 className="text-3xl font-semibold mb-4">{tx('ui:s_f32d5a3b17')}</h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground mb-8">
        {tx('ui:supportBody')}
      </p>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">{tx('ui:s_b37456c453')}</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground mb-3">{tx('ui:s_1d8b210ee1')}</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex min-h-[48px] items-center font-semibold text-primary hover:underline"
        >
          {SUPPORT_EMAIL}
        </a>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">{tx('ui:s_c638bdf57f')}</h2>
        <ul className="space-y-3 text-[15px] text-muted-foreground list-disc ps-5">
          <li>
            <strong className="text-foreground">{tx('ui:s_e0301f4a2e')}</strong>{tx('ui:s_58a5e54938')}</li>
          <li>
            <strong className="text-foreground">{tx('ui:s_da050b8c8c')}</strong> create a class, save the teacher
            PIN, then use Manage Class to open the live roster and class briefing. Read{' '}
            <Link to="/how-it-works" className="underline hover:text-foreground">{tx('ui:s_1dd6a17cb4')}</Link>
            {' '}or preview the{' '}
            <Link to="/classroom" className="underline hover:text-foreground">{tx('ui:s_5e3f5556ee')}</Link>
            .
          </li>
          <li>
            <strong className="text-foreground">{tx('ui:s_df7426db32')}</strong>{tx('ui:s_208d885112')}</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">{tx('ui:s_cf01481f62')}</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Read our{' '}
          <Link to="/privacy-policy" className="text-primary hover:underline font-medium">{tx('ui:s_9db108ba6b')}</Link>
          ,{' '}
          <Link to="/cookie-policy" className="text-primary hover:underline font-medium">{tx('ui:s_e6e178ccc8')}</Link>
          , and{' '}
          <Link to="/methods" className="text-primary hover:underline font-medium">{tx('ui:s_7fac00671a')}</Link>
          .
        </p>
      </section>
    </SiteChrome>
  );
};

export default SupportPage;
