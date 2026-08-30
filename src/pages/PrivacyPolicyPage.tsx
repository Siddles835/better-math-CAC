import React from 'react';
import { Link } from 'react-router-dom';

const COMPANY_NAME = 'MathLift';
const SUPPORT_EMAIL = 'mathlift1234@gmail.com';
const LAST_UPDATED = 'August 29, 2026';
const WEBSITE_URL = 'https://better-math-lalith.vercel.app';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link
            to="/"
            className="text-sm font-medium text-sky-700 hover:text-sky-600 transition-colors"
          >
            ← Back to {COMPANY_NAME}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated {LAST_UPDATED}</p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-[15px] leading-relaxed text-slate-600">
          <p>
            MathLift is a classroom math app for counting, addition, and subtraction. It is designed
            for schools. Students do not create email accounts and do not type their real names.
            This policy explains exactly what data we collect, why, how long we keep it, who it is
            shared with, and how to delete it. It is written to meet Apple&apos;s Developer Code of
            Conduct (not the App Store Guidelines) and to support school obligations under FERPA and
            COPPA (the school may act as the parent&apos;s authorized agent for children under 13).
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
          <h2 className="text-xl font-semibold text-slate-900">Exactly what data MathLift collects</h2>
          <p className="text-[15px] leading-relaxed text-slate-600">
            MathLift collects only the classroom data needed to run the lessons. We do not collect
            legal names, emails, phone numbers, photos, precise location, contacts, health data, or
            payment information from students.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3 font-semibold">Data</th>
                  <th className="py-2 pr-3 font-semibold">Who it belongs to</th>
                  <th className="py-2 pr-3 font-semibold">How it is collected</th>
                  <th className="py-2 font-semibold">Why we use it</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 align-top">
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-3">Generated space name (username), e.g. BraveTiger42</td>
                  <td className="py-2 pr-3">Student</td>
                  <td className="py-2 pr-3">Created on the device. The student cannot type a custom name.</td>
                  <td className="py-2">Identify the student inside one class so they can resume lessons.</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-3">Class code</td>
                  <td className="py-2 pr-3">Teacher chooses it; students enter it</td>
                  <td className="py-2 pr-3">Typed by the teacher when creating a class; typed by the student to join</td>
                  <td className="py-2">Group students into one classroom.</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-3">Teacher PIN</td>
                  <td className="py-2 pr-3">Teacher</td>
                  <td className="py-2 pr-3">Generated on the server when the class is created</td>
                  <td className="py-2">Prove the teacher may manage that class. The PIN is not stored on the device.</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-3">Lesson progress (current planet, completed planets, step inside a lesson)</td>
                  <td className="py-2 pr-3">Student</td>
                  <td className="py-2 pr-3">Saved automatically as the student plays</td>
                  <td className="py-2">Let the student continue where they left off and show the teacher a live roster.</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-3">Last quiz summary (planet, score, number of tries per question)</td>
                  <td className="py-2 pr-3">Student</td>
                  <td className="py-2 pr-3">Saved when a quiz finishes</td>
                  <td className="py-2">Help the teacher see which skills need more practice. Not used for grading outside the app.</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-3">Class start planet</td>
                  <td className="py-2 pr-3">Teacher setting</td>
                  <td className="py-2 pr-3">Chosen on the teacher dashboard</td>
                  <td className="py-2">Unlock the right lessons for the class.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">On-device session (class code + space name, or class code for a teacher)</td>
                  <td className="py-2 pr-3">Whoever last signed in on that device</td>
                  <td className="py-2 pr-3">Saved locally so the app can resume. Only one role is kept at a time.</td>
                  <td className="py-2">Avoid forcing a sign-in on every launch. Cleared on Sign Out or account deletion.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[15px] leading-relaxed text-slate-600">
            MathLift does <strong>not</strong> collect: advertising IDs, analytics user IDs, crash
            reports that include usernames, microphone audio (read-aloud uses on-device speech
            synthesis only), camera, contacts, or precise location.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-[15px] leading-relaxed text-slate-600">
          <h2 className="text-xl font-semibold text-slate-900">How we collect and store it</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Classroom records are stored in Google Cloud Firestore (project mathlift-63f6e) over
              HTTPS. App Transport Security is enforced on iOS.
            </li>
            <li>
              The iOS app stores the last session in the iOS Keychain (not in unencrypted
              UserDefaults). Downloaded files on device use complete file protection so they are
              encrypted when the device is locked.
            </li>
            <li>
              Only one login is kept on a device: the most recent student <em>or</em> teacher
              session. A student on a shared classroom iPad cannot open a leftover teacher session.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-[15px] leading-relaxed text-slate-600">
          <h2 className="text-xl font-semibold text-slate-900">Third parties</h2>
          <p>
            We share classroom data only with the infrastructure needed to run the app:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Google Firebase / Firestore</strong> — stores class codes, generated student
              usernames, and progress. Google&apos;s processing is limited to hosting this database.
              We do <strong>not</strong> enable Firebase Analytics, Google Analytics, Firebase
              Crashlytics, Google Ads, or any advertising SDK.
            </li>
            <li>
              <strong>Vercel</strong> — hosts the app website. Standard server logs (IP address,
              user agent) may be retained briefly by the host for security and uptime. These logs
              are not joined to student usernames.
            </li>
          </ul>
          <p>
            We do not sell student data. We do not use or share student data to build advertising
            profiles, for marketing, or for targeted advertising. Any third party that processes
            this data (Firebase as database host) is required to protect it at least as strongly as
            this policy and Apple&apos;s guidelines.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-[15px] leading-relaxed text-slate-600">
          <h2 className="text-xl font-semibold text-slate-900">Retention, consent, and deletion</h2>
          <p>
            We keep a student record only while that student remains in the class. We keep a class
            record only while the teacher maintains the class.
          </p>
          <p>
            You can revoke consent and delete data at any time using the in-app controls below. An
            email request is not required for deletion.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Student:</strong> open Settings in the app → Delete My Account. This removes
              the username, progress, and quiz history from the class.
            </li>
            <li>
              <strong>Teacher / school administrator:</strong> on the dashboard, tap Remove student
              for one learner, or open Settings → Delete This Class to erase the whole roster,
              teacher PIN, and class code.
            </li>
            <li>
              <strong>Optional email request:</strong> you do not need to email us to delete data.
              If you cannot use the in-app controls, write to{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-700 hover:underline font-medium">
                {SUPPORT_EMAIL}
              </a>{' '}
              with the class code and space name. We will delete the record and confirm.
            </li>
          </ul>
          <p>
            Signing out only clears the device session. Deletion is the step that removes data from
            our servers.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-[15px] leading-relaxed text-slate-600">
          <h2 className="text-xl font-semibold text-slate-900">Children, FERPA, and COPPA</h2>
          <p>
            MathLift is intended for classroom use, including children under 13. We practice data
            minimisation: students receive a generated space name and never enter a real name or
            email. Schools deploying MathLift typically act as the parent&apos;s authorized agent
            under COPPA. Teachers should not enter student legal names, emails, or other education
            records beyond the generated username and progress the app already stores.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-[15px] leading-relaxed text-slate-600">
          <h2 className="text-xl font-semibold text-slate-900">Your rights</h2>
          <p>
            In every region where MathLift is available, you can access, correct, or delete personal
            data. Use the in-app deletion controls described above. Emailing {SUPPORT_EMAIL} is
            optional and is not required to access or delete your data. We will not discriminate
            against you for exercising those rights.
          </p>
        </section>

        <p className="text-sm text-slate-500">
          Also see our <Link to="/cookie-policy" className="text-sky-700 hover:underline">Cookie Policy</Link> and{' '}
          <Link to="/support" className="text-sky-700 hover:underline">Support</Link> page.
        </p>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
