import React from 'react';
import { Link } from 'react-router-dom';

const SUPPORT_EMAIL = 'mathlift1234@gmail.com';

const SupportPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background subtle-stars text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link
            to="/"
            className="text-sm font-medium text-primary hover:brightness-110 transition-colors"
          >
            ← Back to MathLift
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 animate-fade-in">
        <h1 className="text-3xl font-semibold mb-4">Support</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground mb-8">
          MathLift is a classroom math app for counting, addition, and subtraction. Teachers create
          a class; students join with a generated space name and can resume on any device.
        </p>

        <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground mb-3">
            Teachers, students, and parents can email us for help with joining a class, teacher PINs,
            or account questions.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex min-h-[48px] items-center font-semibold text-primary hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </section>

        <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
          <h2 className="text-xl font-semibold mb-3">Quick help</h2>
          <ul className="space-y-3 text-[15px] text-muted-foreground list-disc pl-5">
            <li>
              <strong className="text-foreground">Students:</strong> use Join Class the first time
              (tap the dice until you like the space name), then Login with the same class code and
              space name on any device. Open Settings to delete your account.
            </li>
            <li>
              <strong className="text-foreground">Teachers:</strong> create a class, save the teacher
              PIN, then use Manage Class to open the live roster.
            </li>
            <li>
              <strong className="text-foreground">Sign out:</strong> on the planet screen, tap Sign
              Out, then Login again if you need to switch devices or students.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card/90 p-6">
          <h2 className="text-xl font-semibold mb-3">Privacy</h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Read our{' '}
            <Link to="/privacy-policy" className="text-primary hover:underline font-medium">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link to="/cookie-policy" className="text-primary hover:underline font-medium">
              Cookie Policy
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
};

export default SupportPage;
