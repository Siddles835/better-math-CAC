import { tx } from '@/i18n/tx';
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LegalLanguageNotice from '@/components/LegalLanguageNotice';

const COMPANY_NAME = 'MathLift';
const WEBSITE_URL = 'https://better-math-lalith.vercel.app';
const LAST_UPDATED = 'September 5, 2026';

const browserLinks = [
  {
    label: 'Chrome',
    href: 'https://support.google.com/chrome/answer/95647#zippy=%2Callow-or-block-cookies',
  },
  {
    label: 'Firefox',
    href: 'https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop?redirectslug=enable-and-disable-cookies-website-preferences&redirectlocale=en-US',
  },
  {
    label: 'Safari',
    href: 'https://support.apple.com/en-ie/guide/safari/sfri11471/mac',
  },
  {
    label: 'Edge',
    href: 'https://support.microsoft.com/en-us/windows/microsoft-edge-browsing-data-and-privacy-bb8174ba-9d73-dcf2-9b4a-c582b4e640dd',
  },
  {
    label: 'Opera',
    href: 'https://help.opera.com/en/latest/web-preferences/',
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">{title}</h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

const CookiePolicyPage: React.FC = () => {
  const { t, i18n } = useTranslation('legal');
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="text-sm font-medium text-sky-700 hover:text-sky-600 transition-colors"
          >
            Back to {COMPANY_NAME}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-4">
        <LegalLanguageNotice />
        {i18n.language !== 'en' && (
          <p className="text-[15px] leading-relaxed text-slate-700">{t('cookieLead')}</p>
        )}
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">{tx('ui:s_e6e178ccc8')}</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated {LAST_UPDATED}</p>

        <div className="space-y-4 text-[15px] leading-relaxed text-slate-600 mb-10">
          <p>
            This Cookie Policy explains how {COMPANY_NAME} (&quot;Company,&quot; &quot;we,&quot;
            &quot;us,&quot; and &quot;our&quot;) uses cookies and similar technologies to recognize
            you when you visit our website at{' '}
            <a
              href={WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline break-all"
            >
              {WEBSITE_URL}
            </a>{' '}
            (&quot;Website&quot;). It explains what these technologies are and why we use them, as
            well as your rights to control our use of them.
          </p>
          <p>{tx('ui:s_a7efbb187c')}</p>
        </div>

        <Section title={tx('ui:s_74e6eb3aeb')}>
          <p>{tx('ui:s_de38b64418')}</p>
          <p>
            Cookies set by the website owner (in this case, {COMPANY_NAME}) are called
            &quot;first-party cookies.&quot; Cookies set by parties other than the website owner are
            called &quot;third-party cookies.&quot; Third-party cookies enable third-party features
            or functionality to be provided on or through the website (e.g., advertising, interactive
            content, and analytics). The parties that set these third-party cookies can recognize
            your computer both when it visits the website in question and also when it visits
            certain other websites.
          </p>
        </Section>

        <Section title={tx('ui:s_b7475e1102')}>
          <p>{tx('ui:s_9c40e21376')}</p>
        </Section>

        <Section title={tx('ui:s_bc66158e03')}>
          <p>{tx('ui:s_752c366a25')}</p>
          <p>{tx('ui:s_1c41657863')}</p>
          <p>{tx('ui:s_936f7282c0')}<strong>not</strong>{tx('ui:s_f28990170e')}<code>_ga</code>{tx('ui:s_bb8ce0d35c')}</p>
        </Section>

        <Section title={tx('ui:s_bdae3b4d57')}>
          <p>
            As the means by which you can refuse cookies through your web browser controls vary from
            browser to browser, you should visit your browser&apos;s help menu for more information.
            The following is information about how to manage cookies on the most popular browsers:
          </p>
          <ul className="list-disc ps-6 space-y-2 marker:text-slate-400">
            {browserLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={tx('ui:s_33440fdc8b')}>
          <p>
            No. MathLift does not serve targeted advertising, does not use web beacons or marketing
            pixels, and does not use Flash cookies. Hosting logs from Vercel may briefly include an
            IP address for security and uptime; those logs are not joined to student usernames.
          </p>
        </Section>

        <Section title={tx('ui:s_b25c97c96d')}>
          <p>{tx('ui:s_3a028d5a3a')}</p>
          <p>{tx('ui:s_dd7d715afb')}</p>
        </Section>

        <Section title={tx('ui:s_efa454d76a')}>
          <p>{tx('ui:s_53a76727c9')}</p>
          <p className="font-medium text-slate-800">{COMPANY_NAME}</p>
          <p>
            <a href={WEBSITE_URL} className="text-blue-700 hover:underline break-all">
              {WEBSITE_URL}
            </a>
          </p>
        </Section>

        <footer className="mt-12 pt-8 border-t border-slate-200 text-sm text-slate-500">
          <p>
            This Cookie Policy was created using Termly&apos;s{' '}
            <a
              href="https://termly.io/products/cookie-consent-manager/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline"
            >{tx('ui:s_986572b841')}</a>
            .
          </p>
        </footer>
      </main>
    </div>
  );
};

export default CookiePolicyPage;
