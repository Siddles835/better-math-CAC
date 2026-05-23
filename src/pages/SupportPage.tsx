import React from 'react';
import { Link } from 'react-router-dom';

const SUPPORT_EMAIL = 'mathlift1234@gmail.com';

const SupportPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link
            to="/"
            className="text-sm font-medium text-sky-700 hover:text-sky-600 transition-colors"
          >
            ← Back to MathLift
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold text-slate-900 mb-4">Support</h1>
        <p className="text-[15px] leading-relaxed text-slate-600 mb-6">
          Need help with MathLift? Teachers, students, and parents can reach us by email.
        </p>
        <p className="text-[15px] leading-relaxed text-slate-600">
          Email us at{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-blue-700 hover:underline font-medium"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </main>
    </div>
  );
};

export default SupportPage;
