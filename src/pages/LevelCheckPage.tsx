import { tx } from '@/i18n/tx';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthNavButton from '@/components/AuthNavButton';
import { Button } from '@/components/ui/button';
import { useGame } from '@/context/GameContext';
import { setActiveStudent } from '@/lib/session';
import { generateUsername } from '@/lib/usernames';
import {
  PLACEMENT_QUESTIONS,
  scorePlacement,
  skippedPlacement,
  type PlacementResult,
} from '@/lib/placement';
import {
  SOLO_CLASS_CODE,
  createSoloProgress,
  saveSoloProgress,
  soloProgressToStudent,
} from '@/lib/solo';
import { getLessonForPlanet } from '@/lib/planets';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';
import { hapticTap } from '@/lib/haptics';

const PENDING_NAME_KEY = 'better-math:solo-pending-name';

const LevelCheckPage: React.FC = () => {
  const navigate = useNavigate();
  const { hydrateFromStudent, hydrateClassMax } = useGame();
  const displayName = useMemo(() => {
    try {
      return sessionStorage.getItem(PENDING_NAME_KEY) || generateUsername();
    } catch {
      return generateUsername();
    }
  }, []);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PlacementResult | null>(null);

  const question = PLACEMENT_QUESTIONS[step];
  const done = !!result;

  const finishWith = (placement: PlacementResult) => {
    const progress = createSoloProgress(
      displayName,
      placement.unlockPlanet,
      placement.startPlanet
    );
    saveSoloProgress(progress);
    hydrateClassMax(progress.unlockPlanet);
    hydrateFromStudent(soloProgressToStudent(progress));
    setActiveStudent({
      classCode: SOLO_CLASS_CODE,
      nickname: progress.nickname,
      displayName: progress.displayName,
      solo: true,
    });
    try {
      sessionStorage.removeItem(PENDING_NAME_KEY);
    } catch {
      // ignore
    }
    setResult(placement);
  };

  const choose = (value: number) => {
    if (!question || done) return;
    hapticTap();
    const nextAnswers = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);
    if (step >= PLACEMENT_QUESTIONS.length - 1) {
      finishWith(scorePlacement(nextAnswers));
      return;
    }
    setStep(step + 1);
  };

  const skipAll = () => {
    finishWith(skippedPlacement());
  };

  const goHub = () => {
    navigate(STUDENT_HUB_PATH, { replace: true });
  };

  if (done && result) {
    const startName = tx(`ui:planet_${result.startPlanet}`);
    const unlockName = tx(`ui:planet_${result.unlockPlanet}`);
    const lesson = getLessonForPlanet(result.startPlanet);
    return (
      <div className="min-h-screen bg-background subtle-stars flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md bg-card/95 p-6 rounded-2xl shadow-lg border border-border animate-fade-in">
          <h2 className="text-2xl font-semibold mb-2">{tx('ui:place_doneTitle')}</h2>
          <p className="text-muted-foreground mb-4">{tx(result.summaryKey)}</p>
          <div className="rounded-xl border border-border bg-background/60 p-4 mb-6 space-y-2">
            <p className="text-sm">
              {tx('ui:place_startAt', {
                planet: startName,
                topic: tx(`ui:topic_${lesson}`),
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              {tx('ui:place_unlockedThrough', { planet: unlockName })}
            </p>
            {result.summaryKey !== 'ui:place_sum_skip' && (
              <p className="text-xs text-muted-foreground">
                {tx('ui:place_score', { correct: result.correct, total: result.total })}
              </p>
            )}
          </div>
          <Button type="button" size="lg" className="w-full min-h-[48px]" onClick={goHub}>
            {tx('ui:place_openPlanets')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background subtle-stars flex items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md bg-card/95 p-6 rounded-2xl shadow-lg border border-border animate-fade-in">
        <p className="text-sm text-muted-foreground mb-2">
          {tx('ui:place_for', { name: displayName })}
        </p>
        <h2 className="text-2xl font-semibold mb-2">{tx('ui:place_title')}</h2>
        <p className="text-muted-foreground mb-6">{tx('ui:place_lead')}</p>

        <p className="text-xs font-medium tracking-wide text-muted-foreground mb-3">
          {tx('ui:place_step', { step: step + 1, total: PLACEMENT_QUESTIONS.length })}
        </p>
        <p className="text-lg font-medium mb-4">{tx(question.promptKey)}</p>

        {question.dots != null && (
          <div
            className="flex flex-wrap justify-center gap-3 mb-6"
            aria-hidden
          >
            {Array.from({ length: question.dots }, (_, i) => (
              <span
                key={i}
                className="inline-block w-5 h-5 rounded-full bg-emerald-400/90"
              />
            ))}
          </div>
        )}

        {question.equation && (
          <p className="text-3xl font-semibold text-center mb-6 tracking-wide" dir="ltr">
            {question.equation}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          {question.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => choose(choice)}
              className="min-h-[56px] rounded-xl border border-border bg-background text-xl font-semibold hover:bg-emerald-500/15 hover:border-emerald-500/40 active:scale-[0.98] transition-all"
            >
              {choice}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-between gap-3">
          <AuthNavButton onClick={() => navigate('/solo')} />
          <button
            type="button"
            onClick={skipAll}
            className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            {tx('ui:place_skip')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LevelCheckPage;
