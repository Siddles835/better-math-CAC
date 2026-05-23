import React from 'react';
import { Link } from 'react-router-dom';
import policyHtml from '@/assets/privacy-policy.html?raw';

const COMPANY_NAME = 'MathLift';

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

      <main
        className="mx-auto max-w-3xl px-6 py-10 privacy-policy-content overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: policyHtml }}
      />
    </div>
  );
};

export default PrivacyPolicyPage;
