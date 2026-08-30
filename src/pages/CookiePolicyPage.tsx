import React from 'react';
import { Link } from 'react-router-dom';

const COMPANY_NAME = 'MathLift';
const WEBSITE_URL = 'https://better-math-lalith.vercel.app';
const LAST_UPDATED = 'August 27, 2026';

const browserLinks = [
  {
    label: 'Chrome',
    href: 'https://support.google.com/chrome/answer/95647#zippy=%2Callow-or-block-cookies',
  },
  {
    label: 'Internet Explorer',
    href: 'https://support.microsoft.com/en-us/windows/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d',
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
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="text-sm font-medium text-sky-700 hover:text-sky-600 transition-colors"
          >
            ← Back to {COMPANY_NAME}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">Cookie Policy</h1>
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
          <p>
            In some cases we may use cookies to collect personal information, or that becomes
            personal information if we combine it with other information.
          </p>
        </div>

        <Section title="What are cookies?">
          <p>
            Cookies are small data files that are placed on your computer or mobile device when you
            visit a website. Cookies are widely used by website owners in order to make their
            websites work, or to work more efficiently, as well as to provide reporting information.
          </p>
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

        <Section title="Why do we use cookies?">
          <p>
            We use first-party storage only as needed for the app to work (remembering the last
            class code and the most recent student or teacher session on this device). MathLift does
            not use advertising cookies, marketing pixels, or third-party analytics cookies.
          </p>
        </Section>

        <Section title="How can I control cookies?">
          <p>
            MathLift does not currently show an in-app cookie preference banner. You can control
            cookies through your browser or device settings (block or clear cookies, or use private
            browsing).
          </p>
          <p>
            Classroom progress is stored in Firebase using your class code and generated student
            space name — that is app functionality, not advertising cookies.
          </p>
          <p>
            MathLift does <strong>not</strong> use Google Analytics, advertising cookies, or
            marketing pixels. We do not set <code>_ga</code> or similar third-party analytics
            cookies.
          </p>
        </Section>

        <Section title="How can I control cookies on my browser?">
          <p>
            As the means by which you can refuse cookies through your web browser controls vary from
            browser to browser, you should visit your browser&apos;s help menu for more information.
            The following is information about how to manage cookies on the most popular browsers:
          </p>
          <ul className="list-disc pl-6 space-y-2 marker:text-slate-400">
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

        <Section title="Do you use advertising, analytics, or tracking pixels?">
          <p>
            No. MathLift does not serve targeted advertising, does not use web beacons or marketing
            pixels, and does not use Flash cookies. Hosting logs from Vercel may briefly include an
            IP address for security and uptime; those logs are not joined to student usernames.
          </p>
        </Section>

        <Section title="How often will you update this Cookie Policy?">
          <p>
            We may update this Cookie Policy from time to time in order to reflect, for example,
            changes to the cookies we use or for other operational, legal, or regulatory reasons.
            Please therefore revisit this Cookie Policy regularly to stay informed about our use of
            cookies and related technologies.
          </p>
          <p>The date at the top of this Cookie Policy indicates when it was last updated.</p>
        </Section>

        <Section title="Where can I get further information?">
          <p>
            If you have any questions about our use of cookies or other technologies, please contact
            us at:
          </p>
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
            >
              Cookie Consent Manager
            </a>
            .
          </p>
        </footer>
      </main>
    </div>
  );
};

export default CookiePolicyPage;
