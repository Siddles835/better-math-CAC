import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LessonShell from '@/components/LessonShell';
import PathActivity from '@/components/PathActivity';
import ThoughtCard from '@/components/ThoughtCard';
import { Button } from '@/components/ui/button';
import { useGame } from '@/context/GameContext';
import { SAMPLE_STUDENTS } from '@/lib/cognition/demoClass';
import {
  adaptPath,
  buildPersonalPath,
  type ItemOutcome,
  type PersonalPath,
} from '@/lib/cognition/personalPath';
import { diagnoseTrace, LessonTrace, type Diagnosis } from '@/lib/cognition';
import { getActiveStudent, getStudentDisplayName } from '@/lib/session';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';

interface PersonalPracticePageProps {
  demo?: boolean;
}

const PersonalPracticePage: React.FC<PersonalPracticePageProps> = ({ demo = false }) => {
  const navigate = useNavigate();
  const { lastDiagnosis, saveDiagnosis } = useGame();
  const student = getActiveStudent();
  const nickname = demo ? SAMPLE_STUDENTS[0].nickname : student?.nickname ?? 'student';
  const diagnosis = demo ? SAMPLE_STUDENTS[0].lastDiagnosis ?? null : lastDiagnosis;

  const [path, setPath] = useState<PersonalPath>(() =>
    buildPersonalPath(nickname, diagnosis, demo ? 'sample' : undefined)
  );
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const traceRef = useRef(new LessonTrace());

  const displayName = demo
    ? SAMPLE_STUDENTS[0].nickname
    : student
      ? getStudentDisplayName(student)
      : 'Student';

  const planet = diagnosis?.nextPlanet ?? 'earth';
  const item = step >= 0 ? path.items[step] : undefined;

  const intro = useMemo(
    () => ({
      title: path.title,
      why: path.why,
    }),
    [path.title, path.why]
  );

  const restart = () => {
    traceRef.current = new LessonTrace();
    setPath(buildPersonalPath(nickname, diagnosis, demo ? 'sample' : undefined));
    setStep(-1);
    setDone(false);
    setReady(false);
    setResult(null);
  };

  const finishSession = () => {
    const next = diagnoseTrace(planet, traceRef.current);
    setResult(next);
    setDone(true);
    if (!demo) void saveDiagnosis(next);
  };

  const handleResult = (outcome: ItemOutcome, value: number) => {
    if (!item) return;
    traceRef.current.check(value, item.target);
    setPath((current) => adaptPath(current, step, outcome));
    setReady(true);
  };

  const handleNext = () => {
    if (step < 0) {
      setStep(0);
      setReady(false);
      return;
    }
    if (!ready) return;
    if (step >= path.items.length - 1) {
      finishSession();
      return;
    }
    setStep(step + 1);
    setReady(false);
  };

  const goHub = () => {
    navigate(demo ? '/classroom' : STUDENT_HUB_PATH);
  };

  return (
    <LessonShell
      planet={planet}
      totalSteps={path.items.length}
      step={done ? path.items.length - 1 : Math.max(0, step)}
      onBack={goHub}
      onNext={done ? goHub : handleNext}
      showNext={done || (step >= 0 && ready)}
      nextLabel={done ? (demo ? 'Sample classroom' : 'Back to planets') : step >= path.items.length - 1 ? 'Finish' : 'Next'}
      backLabel={demo ? 'Sample classroom' : 'Planets'}
    >
      {step < 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8">
          {demo && (
            <p className="text-sm text-muted-foreground mb-3">
              Sample practice for {displayName} — not a live student
            </p>
          )}
          {!demo && (
            <p className="text-sm text-muted-foreground mb-3">Practice for {displayName}</p>
          )}
          <h1 className="text-2xl sm:text-3xl font-semibold mb-3">{intro.title}</h1>
          <p className="text-[16px] text-muted-foreground leading-relaxed mb-6">{intro.why}</p>
          <p className="text-sm text-muted-foreground mb-8">
            {demo
              ? 'Three short problems, built on this device from how this student worked. Numbers change by child and by day. If one is missed, the next one can tighten.'
              : 'Three short problems. Start when you are ready.'}
          </p>
          <Button type="button" size="lg" onClick={handleNext}>
            Start
          </Button>
        </div>
      )}

      {item && !done && (
        <div className="flex-1 flex flex-col items-center justify-center py-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground mb-4">
            {step + 1} of {path.items.length}
          </p>
          <PathActivity
            key={item.id}
            item={item}
            onResult={handleResult}
            onTraceTap={(value, target) => traceRef.current.tap(value, target)}
            onTraceRemove={() => traceRef.current.remove()}
            onTraceDraw={(read, expected) => traceRef.current.setDigit(read, expected)}
          />
        </div>
      )}

      {done && result && (
        <div className="flex-1 flex flex-col items-center justify-center py-8">
          <h2 className="text-2xl font-semibold mb-4">Practice complete</h2>
          <ThoughtCard diagnosis={result} practiceLabel="Practice again" onPractice={restart} />
        </div>
      )}
    </LessonShell>
  );
};

export default PersonalPracticePage;
