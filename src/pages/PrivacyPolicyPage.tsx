import { tx } from '@/i18n/tx';
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LegalLanguageNotice from '@/components/LegalLanguageNotice';

const COMPANY_NAME = 'MathLift';
const SUPPORT_EMAIL = 'mathlift1234@gmail.com';
const LAST_UPDATED = 'October 4, 2026';
const WEBSITE_URL = 'https://better-math-lalith.vercel.app';

const PrivacyPolicyPage: React.FC = () => {
  const { t, i18n } = useTranslation('legal');
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link
            to="/"
            className="text-sm font-medium text-sky-700 hover:text-sky-600 transition-colors"
          >
            Back to {COMPANY_NAME}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <LegalLanguageNotice />
        {i18n.language !== 'en' && (
          <p className="text-[15px] leading-relaxed text-slate-700">{t('privacyLead')}</p>
        )}
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">{tx('ui:s_9db108ba6b')}</h1>
          <p className="text-sm text-slate-500">Last updated {LAST_UPDATED}</p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-[15px] leading-relaxed text-slate-600">
          <p>
            MathLift is a classroom math app for counting, addition, and subtraction. It is designed
            for schools and also offers an individual (“Learn on my own”) mode. Students do not create
            email accounts and do not type their real names. This policy explains exactly what data we
            collect, why, how long we keep it, who it is shared with, and how to delete it. It is
            written to meet Apple&apos;s Developer Code of Conduct (not the App Store Guidelines) and
            to support school obligations under FERPA and COPPA (the school may act as the parent&apos;s
            authorized agent for children under 13).
          </p>
          <p>
            <strong>{t('individualTitle')}</strong> {t('individualBody')}
          </p>
          <p>
            Contact:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-700 hover:underline font-medium">
              {SUPPORT_EMAIL}
            </a>
            . Website:{' '}
            <a href={WEBSITE_URL} className="text-blue-700 hover:underline font-medium">
              {WEBSITE_URL}
            </a>
            .
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">{tx('ui:s_c2efb31cab')}</h2>
          <p className="text-[15px] leading-relaxed text-slate-600">{tx('ui:s_25fd8aeafc')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pe-3 font-semibold">{tx('ui:s_e5e429bcc9')}</th>
                  <th className="py-2 pe-3 font-semibold">{tx('ui:s_ff34dc822f')}</th>
                  <th className="py-2 pe-3 font-semibold">{tx('ui:s_ef3d175427')}</th>
                  <th className="py-2 font-semibold">Why we use it</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 align-top">
                <tr className="border-b border-slate-100">
                  <td className="py-2 pe-3">{tx('ui:s_cdcca732e9')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_42b3279479')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_0fe338df82')}</td>
                  <td className="py-2">{tx('ui:s_9d5fa24ec2')}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pe-3">{tx('ui:s_1636cd7d91')}</td>
                  <td className="py-2 pe-3">Teacher chooses it; students enter it</td>
                  <td className="py-2 pe-3">Typed by the teacher when creating a class; typed by the student to join</td>
                  <td className="py-2">{tx('ui:s_83d74b6bd7')}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pe-3">{tx('ui:s_d4573570bc')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_da33ddcb58')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_d769fde217')}</td>
                  <td className="py-2">{tx('ui:s_c78a55bcc0')}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pe-3">{tx('ui:s_df1c76ba12')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_42b3279479')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_3998da7321')}</td>
                  <td className="py-2">{tx('ui:s_78f3a19c07')}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pe-3">{tx('ui:s_8945850980')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_42b3279479')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_a3084ba7f1')}</td>
                  <td className="py-2">{tx('ui:s_334efe19fc')}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pe-3">{tx('ui:s_3582f7484d')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_42b3279479')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_6cb88ac714')}</td>
                  <td className="py-2">{tx('ui:s_a9a0158377')}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pe-3">{tx('ui:s_65d8a6668b')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_42b3279479')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_2169a7771f')}</td>
                  <td className="py-2">
                    Show the teacher which patterns are shrinking. Kept and deleted with the rest of that student&apos;s progress.
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pe-3">{t('exploreSignals')}</td>
                  <td className="py-2 pe-3">{t('exploreSignalsWhere')}</td>
                  <td className="py-2 pe-3">{t('exploreSignalsHow')}</td>
                  <td className="py-2">{t('exploreSignalsWhy')}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pe-3">{tx('ui:s_7dba2ffb5b')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_170e35edbe')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_289516da74')}</td>
                  <td className="py-2">{tx('ui:s_d0bfabc000')}</td>
                </tr>
                <tr>
                  <td className="py-2 pe-3">{tx('ui:s_d8b7ebdc02')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_142239a38f')}</td>
                  <td className="py-2 pe-3">{tx('ui:s_4590b30f09')}</td>
                  <td className="py-2">{tx('ui:s_1d36923f3a')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[15px] leading-relaxed text-slate-600">{tx('ui:s_936f7282c0')}<strong>not</strong>{tx('ui:s_ca54156154')}</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-[15px] leading-relaxed text-slate-600">
          <h2 className="text-xl font-semibold text-slate-900">{tx('ui:s_15ab50faca')}</h2>
          <ul className="list-disc ps-5 space-y-2">
            <li>{tx('ui:s_f05a94ff46')}</li>
            <li>{tx('ui:s_fa65bf4660')}</li>
            <li>{tx('ui:s_c3b2d311ee')}<em>or</em>{tx('ui:s_8bcf685e48')}</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-[15px] leading-relaxed text-slate-600">
          <h2 className="text-xl font-semibold text-slate-900">{tx('ui:s_6f8b52e948')}</h2>
          <p>{tx('ui:s_1e07b6dea9')}</p>
          <ul className="list-disc ps-5 space-y-2">
            <li>
              <strong>{tx('ui:s_12e9a490f2')}</strong> {tx('ui:firebaseStores')} <strong>{tx('ui:s_d3ba64f3d8')}</strong></li>
            <li>
              <strong>Vercel</strong>{tx('ui:s_862dc2dff5')}</li>
          </ul>
          <p>
            We do not sell student data. We do not use or share student data to build advertising
            profiles, for marketing, or for targeted advertising. Any third party that processes
            this data (Firebase as database host) is required to protect it at least as strongly as
            this policy and Apple&apos;s guidelines.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-[15px] leading-relaxed text-slate-600">
          <h2 className="text-xl font-semibold text-slate-900">{tx('ui:s_411be97727')}</h2>
          <p>{tx('ui:s_4be32cb51c')}</p>
          <p>{tx('ui:s_a996b17496')}</p>
          <ul className="list-disc ps-5 space-y-2">
            <li>
              <strong>{tx('ui:s_3708a66bf5')}</strong>{tx('ui:s_616c8beb9a')}</li>
            <li>
              <strong>{tx('ui:s_57a6f1f748')}</strong>{tx('ui:s_2390c26b51')}</li>
            <li>
              <strong>{tx('ui:s_80ae64f911')}</strong> you do not need to email us to delete data.
              If you cannot use the in-app controls, write to{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-700 hover:underline font-medium">
                {SUPPORT_EMAIL}
              </a>{' '}
              with the class code and space name. We will delete the record and confirm.
            </li>
          </ul>
          <p>{tx('ui:s_640351f119')}</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-[15px] leading-relaxed text-slate-600">
          <h2 className="text-xl font-semibold text-slate-900">{tx('ui:s_a947dcf4c0')}</h2>
          <p>
            MathLift is intended for classroom use, including children under 13. We practice data
            minimisation: students receive a generated space name and never enter a real name or
            email. Schools deploying MathLift typically act as the parent&apos;s authorized agent
            under COPPA. Teachers should not enter student legal names, emails, or other education
            records beyond the generated username and progress the app already stores.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-[15px] leading-relaxed text-slate-600">
          <h2 className="text-xl font-semibold text-slate-900">{tx('ui:s_e71102d544')}</h2>
          <p>
            In every region where MathLift is available, you can access, correct, or delete personal
            data. Use the in-app deletion controls described above. Emailing {SUPPORT_EMAIL} is
            optional and is not required to access or delete your data. We will not discriminate
            against you for exercising those rights.
          </p>
        </section>

        <p className="text-sm text-slate-500">{tx('ui:s_750c35a37a')}<Link to="/cookie-policy" className="text-sky-700 hover:underline">{tx('ui:s_e6e178ccc8')}</Link> and{' '}
          <Link to="/support" className="text-sky-700 hover:underline">{tx('ui:s_f32d5a3b17')}</Link> page.
        </p>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
