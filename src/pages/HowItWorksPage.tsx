import React from 'react';
import { Link } from 'react-router-dom';
import SiteChrome from '@/components/SiteChrome';

const HowItWorksPage: React.FC = () => {
  return (
    <SiteChrome>
      <p className="text-sm font-medium text-muted-foreground mb-2">For teachers and classrooms</p>
      <h1 className="text-3xl font-semibold mb-4">How MathLift works</h1>
      <p className="text-[16px] leading-relaxed text-muted-foreground mb-10">
        Early math gaps are hard to see in a class of 25. MathLift is a K–2 solar-system practice
        app that watches how a student builds a number — taps, retries, written digits — and tells
        the teacher which misconception to practice next. Inference runs on the device. Drawings
        and tap traces are not uploaded.
      </p>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">The classroom problem</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          A first grader who always recounts from one, or who subtracts the smaller number from the
          larger, can still look “fine” on a weekly worksheet. By the time that shows up on a test,
          the habit is set. Teachers rarely have time to diagnose each child’s strategy in the
          moment.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-4">What happens in a session</h2>
        <ol className="space-y-4 text-[15px] text-muted-foreground list-decimal pl-5">
          <li>
            <span className="text-foreground font-medium">Practice on a planet.</span> Counting on
            the inner planets, addition on Earth through Jupiter, subtraction on Saturn through
            Neptune.
          </li>
          <li>
            <span className="text-foreground font-medium">The app records the strategy, not a grade.</span>{' '}
            Overshoot, restart-from-one, reversed digits, and swapped equation order are features
            for an on-device decision tree. Written numbers are read by a small local model.
          </li>
          <li>
            <span className="text-foreground font-medium">The student gets a practice built for them.</span>{' '}
            Three short problems are generated on the device from that pattern — different numbers
            per child and per day. If a problem is missed, the next one tightens. This is not a
            chatbot.
          </li>
          <li>
            <span className="text-foreground font-medium">The solar system updates.</span> The
            suggested planet is highlighted. The teacher roster stores only a short summary: the
            named pattern, a confidence, and a next planet.
          </li>
        </ol>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">What the models output</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground mb-3">
          Not “struggling.” A named K–2 pattern the teacher can act on tomorrow:
        </p>
        <ul className="space-y-2 text-[15px] text-muted-foreground list-disc pl-5">
          <li>Counting from one each time</li>
          <li>Going past the target</li>
          <li>Subtracting the smaller from the larger</li>
          <li>Treating 2+5 and 5+2 as different facts</li>
          <li>Reversing a written 6 or 9</li>
          <li>Number words that do not match the amount</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          Technical detail is on the{' '}
          <Link to="/methods" className="underline underline-offset-2 hover:text-foreground">
            methods
          </Link>{' '}
          page. A filled-in teacher view is in the{' '}
          <Link to="/classroom" className="underline underline-offset-2 hover:text-foreground">
            sample classroom
          </Link>
          .
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">Privacy</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Students join with a generated space name, not a legal name. Drawings and raw interaction
          traces stay on the device. Firebase stores class membership, planet progress, last quiz
          score, and the thinking summary. There is no advertising or analytics SDK. Accounts and
          classes can be deleted from Settings.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card/90 p-6 print:hidden">
        <h2 className="text-xl font-semibold mb-3">Try it</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground mb-4">
          Create a class, join as a student, and complete Earth or the Sun. Then open the teacher
          dashboard — the class briefing lists who to pull for a five-minute group.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/teacher-register"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Create a class
          </Link>
          <Link
            to="/student-register"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Join as a student
          </Link>
          <Link
            to="/classroom"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Sample classroom
          </Link>
          <Link
            to="/try-practice"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Try a student practice
          </Link>
        </div>
      </section>
    </SiteChrome>
  );
};

export default HowItWorksPage;
