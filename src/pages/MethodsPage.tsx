import React from 'react';
import { Link } from 'react-router-dom';
import SiteChrome from '@/components/SiteChrome';
import { MISCONCEPTION_LABEL } from '@/lib/cognition';

const FEATURES = [
  ['overshoot', 'Count went past the target'],
  ['restartFromOne', 'Started over from one after a reset'],
  ['equationSwap', 'Built the equation in the opposite order'],
  ['drawReversal', 'Written digit matched a known reversal (6/9, 2/5)'],
  ['drawMatch', 'Written digit matched the expected number'],
  ['retries', 'Checks before a correct total'],
  ['removeCount', 'Objects taken back after placing too many'],
  ['planetIndex / lessonCode', 'Where in the solar system the session happened'],
];

const MethodsPage: React.FC = () => {
  return (
    <SiteChrome>
      <p className="text-sm font-medium text-muted-foreground mb-2">For teachers and reviewers</p>
      <h1 className="text-3xl font-semibold mb-4">How the models work</h1>
      <p className="text-[16px] leading-relaxed text-muted-foreground mb-10">
        MathLift does not send drawings or tap traces to a cloud model. Two small models run in the
        browser: a decision tree over session features, and a digit network over a 16×16 grid of the
        student’s writing. Both were trained offline and shipped as JSON.
      </p>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">What is measured</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground mb-3">
          The tree does not see a score. It sees how the answer was built. Features include:
        </p>
        <ul className="space-y-2 text-[15px] text-muted-foreground list-disc pl-5">
          {FEATURES.map(([name, meaning]) => (
            <li key={name}>
              <span className="font-medium text-foreground">{name}</span>
              {' — '}
              {meaning}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">The two models</h2>
        <div className="space-y-5 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Misconception tree.</span> A sklearn
            decision tree exported to JSON and walked in TypeScript. Held-out accuracy on the
            synthetic traces used for training is 0.98. That number describes the training
            distribution. It is not a classroom study.
          </p>
          <p>
            <span className="font-medium text-foreground">Digit network.</span> A 256→48→10
            multilayer perceptron over a 16×16 ink grid. Held-out accuracy on synthetic digits is
            1.00. Reversed 2, 5, 6, and 9 were included so the app can flag a written reversal
            without uploading the drawing.
          </p>
          <p>
            Training code lives in <code className="text-foreground">ml/train_cognition.py</code>.
            Weights ship in the app bundle. Inference never leaves the device.
          </p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">Named outputs</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground mb-3">
          The tree returns one of eight codes. Teachers see the plain-language label, not the code.
        </p>
        <ul className="space-y-2 text-[15px] text-muted-foreground list-disc pl-5">
          {(Object.keys(MISCONCEPTION_LABEL) as Array<keyof typeof MISCONCEPTION_LABEL>).map(
            (code) => (
              <li key={code}>
                <span className="font-medium text-foreground">{MISCONCEPTION_LABEL[code]}</span>
                <span className="text-muted-foreground/80"> ({code})</span>
              </li>
            )
          )}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">What this is not</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          This is not a grade, a learning disability screen, or a substitute for a teacher. Low
          confidence stays labeled as still gathering. Raw strokes stay in memory and are discarded
          when the page closes. Firebase stores only the summary: the named pattern, a confidence,
          and a suggested planet.
        </p>
      </section>

      <p className="text-sm text-muted-foreground">
        See a filled-in briefing in the{' '}
        <Link to="/classroom" className="underline underline-offset-2 hover:text-foreground">
          sample classroom
        </Link>
        , or read{' '}
        <Link to="/how-it-works" className="underline underline-offset-2 hover:text-foreground">
          how a session runs
        </Link>
        .
      </p>
    </SiteChrome>
  );
};

export default MethodsPage;
