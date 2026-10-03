import { saveDiagnosisSafely } from '@/lib/saveDiagnosisSafely';
import { tx } from '@/i18n/tx';
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
  itemSignature,
  loadPracticeMemory,
  savePracticeMemory,
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

  const memory = useRef(loadPracticeMemory());
  const [round, setRound] = useState(demo ? 0 : memory.current.round);
  const [path, setPath] = useState<PersonalPath>(() =>
    buildPersonalPath(nickname, diagnosis, demo ? 'sample' : undefined, {
      round: demo ? 0 : memory.current.round,
      entropy: demo ? 0 : Date.now(),
      recent: memory.current.recent,
      accuracy: memory.current.accuracy,
      demo,
    })
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
    const nextRound = round + 1;
    const recent = [...memory.current.recent, ...path.items.map(itemSignature)].slice(-18);
    const checksEvents = traceRef.current.events.filter((event) => event.kind === 'check');
    const correct = checksEvents.filter((event) => event.value === event.target).length;
    const checks = checksEvents.length;
    const accuracy = checks ? correct / checks : memory.current.accuracy;
    memory.current = { recent, accuracy, round: nextRound };
    if (!demo) savePracticeMemory(recent, accuracy, nextRound);
    traceRef.current = new LessonTrace();
    setRound(nextRound);
    setPath(buildPersonalPath(nickname, diagnosis, demo ? 'sample' : undefined, {
      round: nextRound,
      entropy: demo ? nextRound : Date.now(),
      recent,
      accuracy,
      demo,
    }));
    setStep(0);
    setDone(false);
    setReady(false);
    setResult(null);
  };

  const finishSession = () => {
    const next = diagnoseTrace(planet, traceRef.current);
    setResult(next);
    setDone(true);
    if (!demo) saveDiagnosisSafely(saveDiagnosis, next);
  };

  const itemBase = useRef(path);
  React.useEffect(() => {
    itemBase.current = path;
    // Capture the path at the start of each item so a later correct re-check
    // does not keep a tighten that belonged to the earlier wrong check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleResult = (outcome: ItemOutcome, value: number) => {
    if (!item) return;
    traceRef.current.check(value, item.target);
    setPath(adaptPath(itemBase.current, step, outcome));
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
      nextLabel={done ? (demo ? tx('ui:sampleClassroom') : tx('ui:backPlanets')) : step >= path.items.length - 1 ? tx('ui:finishPractice') : tx('common:next')}
      backLabel={demo ? tx('ui:sampleClassroom') : tx('ui:planetsWord')}
    >
      {step < 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8">
          {demo && (
            <p className="text-sm text-muted-foreground mb-3">
              {tx('ui:sampleFor', { name: displayName })}
            </p>
          )}
          {!demo && (
            <p className="text-sm text-muted-foreground mb-3">{tx('ui:practiceFor', { name: displayName })}</p>
          )}
          <h1 className="text-2xl sm:text-3xl font-semibold mb-3">{intro.title}</h1>
          <p className="text-[16px] text-muted-foreground leading-relaxed mb-6">{intro.why}</p>
          <p className="text-sm text-muted-foreground mb-8">
            {demo ? tx('ui:demoRoundNote') : tx('ui:liveRoundNote')}
          </p>
          <Button type="button" size="lg" onClick={handleNext}>{tx('ui:s_952f375412')}</Button>
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
          <h2 className="text-2xl font-semibold mb-4">{tx('ui:s_199ab5537a')}</h2>
          <ThoughtCard diagnosis={result} practiceLabel={tx('ui:practiceAgain')} onPractice={restart} />
        </div>
      )}
    </LessonShell>
  );
};

export default PersonalPracticePage;
