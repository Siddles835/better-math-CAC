import React from 'react';
import { Link } from 'react-router-dom';

const COMPANY_NAME = 'MathLift';
const WEBSITE_URL = 'https://better-math-lalith.vercel.app';
const LAST_UPDATED = 'May 22, 2026';

type CookieEntry = {
  name: string;
  purpose: string;
  provider: string;
  service: string;
  servicePrivacyUrl: string;
  type: string;
  expiresIn: string;
};

const analyticsCookies: CookieEntry[] = [
  {
    name: '_ga',
    purpose:
      'Records a particular ID used to come up with data about website usage by the user',
    provider: '.better-math-lalith.vercel.app',
    service: 'Google Analytics',
    servicePrivacyUrl: 'https://business.safety.google/privacy/',
    type: 'http_cookie',
    expiresIn: '1 year 1 month 4 days',
  },
  {
    name: '_ga_#',
    purpose:
      'Used to distinguish individual users by means of designation of a randomly generated number as client identifier, which allows calculation of visits and sessions',
    provider: '.better-math-lalith.vercel.app',
    service: 'Google Analytics',
    servicePrivacyUrl: 'https://business.safety.google/privacy/',
    type: 'http_cookie',
    expiresIn: '1 year 1 month 4 days',
  },
];

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

const adOptOutLinks = [
  { label: 'Digital Advertising Alliance', href: 'http://www.aboutads.info/choices/' },
  { label: 'Digital Advertising Alliance of Canada', href: 'https://youradchoices.ca/' },
  {
    label: 'European Interactive Digital Advertising Alliance',
    href: 'http://www.youronlinechoices.com/',
  },
];

function CookieCard({ cookie }: { cookie: CookieEntry }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Name', value: cookie.name },
    { label: 'Purpose', value: cookie.purpose },
    { label: 'Provider', value: cookie.provider },
    {
      label: 'Service',
      value: (
        <>
          {cookie.service}{' '}
          <a
            href={cookie.servicePrivacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:underline"
          >
            View Service Privacy Policy
          </a>
        </>
      ),
    },
    { label: 'Type', value: cookie.type },
    { label: 'Expires in', value: cookie.expiresIn },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={`grid grid-cols-[minmax(5rem,auto)_1fr] gap-x-4 gap-y-1 px-4 py-3 text-sm ${
            i < rows.length - 1 ? 'border-b border-slate-100' : ''
          }`}
        >
          <span className="text-right font-medium text-slate-800">{row.label}:</span>
          <span className="text-slate-600 break-words">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

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
            We use first- and third-party cookies for several reasons. Some cookies are required for
            technical reasons in order for our Website to operate, and we refer to these as
            &quot;essential&quot; or &quot;strictly necessary&quot; cookies. Other cookies also
            enable us to track and target the interests of our users to enhance the experience on
            our Online Properties. Third parties serve cookies through our Website for advertising,
            analytics, and other purposes. This is described in more detail below.
          </p>
        </Section>

        <Section title="How can I control cookies?">
          <p>
            You have the right to decide whether to accept or reject cookies. You can exercise your
            cookie rights by setting your preferences in the Cookie Preference Center. The Cookie
            Preference Center allows you to select which categories of cookies you accept or
            reject. Essential cookies cannot be rejected as they are strictly necessary to provide
            you with services.
          </p>
          <p>
            The Cookie Preference Center can be found in the notification banner and on our Website.
            If you choose to reject cookies, you may still use our Website though your access to
            some functionality and areas of our Website may be restricted. You may also set or
            amend your web browser controls to accept or refuse cookies.
          </p>
          <p>
            The specific types of first- and third-party cookies served through our Website and the
            purposes they perform are described in the table below (please note that the specific
            cookies served may vary depending on the specific Online Properties you visit):
          </p>

          <h3 className="text-lg font-semibold text-slate-900 pt-2">
            Analytics and customization cookies
          </h3>
          <p>
            These cookies collect information that is used either in aggregate form to help us
            understand how our Website is being used or how effective our marketing campaigns are, or
            to help us customize our Website for you.
          </p>
          <div className="space-y-4 not-prose">
            {analyticsCookies.map((cookie) => (
              <CookieCard key={cookie.name} cookie={cookie} />
            ))}
          </div>
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
          <p>
            In addition, most advertising networks offer you a way to opt out of targeted
            advertising. If you would like to find out more information, please visit:
          </p>
          <ul className="list-disc pl-6 space-y-2 marker:text-slate-400">
            {adOptOutLinks.map((link) => (
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

        <Section title="What about other tracking technologies, like web beacons?">
          <p>
            Cookies are not the only way to recognize or track visitors to a website. We may use
            other, similar technologies from time to time, like web beacons (sometimes called
            &quot;tracking pixels&quot; or &quot;clear gifs&quot;). These are tiny graphics files
            that contain a unique identifier that enables us to recognize when someone has visited our
            Website. This allows us, for example, to monitor the traffic patterns of users from one
            page within a website to another, to deliver or communicate with cookies, to understand
            whether you have come to the website from an online advertisement displayed on a
            third-party website, to improve site performance, and to measure the success of email
            marketing campaigns. In many instances, these technologies are reliant on cookies to
            function properly, and so declining cookies will impair their functioning.
          </p>
        </Section>

        <Section title="Do you use Flash cookies or Local Shared Objects?">
          <p>
            Websites may also use so-called &quot;Flash Cookies&quot; (also known as Local Shared
            Objects or &quot;LSOs&quot;) to, among other things, collect and store information about
            your use of our services, fraud prevention, and for other site operations.
          </p>
          <p>
            If you do not want Flash Cookies stored on your computer, you can adjust the settings of
            your Flash player to block Flash Cookies storage using the tools contained in the{' '}
            <a
              href="http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager07.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline"
            >
              Website Storage Settings Panel
            </a>
            . You can also control Flash Cookies by going to the{' '}
            <a
              href="http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager03.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline"
            >
              Global Storage Settings Panel
            </a>{' '}
            and following the instructions (which may include instructions that explain, for
            example, how to delete existing Flash Cookies, how to prevent Flash LSOs from being
            placed on your computer without your being asked, and (for Flash Player 8 and later) how
            to block Flash Cookies that are not being delivered by the operator of the page you are
            on at the time).
          </p>
          <p>
            Please note that setting the Flash Player to restrict or limit acceptance of Flash
            Cookies may reduce or impede the functionality of some Flash applications, including,
            potentially, Flash applications used in connection with our services or online content.
          </p>
        </Section>

        <Section title="Do you serve targeted advertising?">
          <p>
            Third parties may serve cookies on your computer or mobile device to serve advertising
            through our Website. These companies may use information about your visits to this and
            other websites in order to provide relevant advertisements about goods and services that
            you may be interested in. They may also employ technology that is used to measure the
            effectiveness of advertisements. They can accomplish this by using cookies or web
            beacons to collect information about your visits to this and other sites in order to
            provide relevant advertisements about goods and services of potential interest to you.
            The information collected through this process does not enable us or them to identify
            your name, contact details, or other details that directly identify you unless you choose
            to provide these.
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
