import { tx } from '@/i18n/tx';
import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthNavButton from '@/components/AuthNavButton';
import NumberDraw from '@/components/NumberDraw';
import { Button } from '@/components/ui/button';
import { useGame } from '@/context/GameContext';
import { useAnswerCheck } from '@/hooks/useAnswerCheck';
import type { DigitRead, UnreadableReason } from '@/lib/cognition';
import { nicknameKey, patchStudentFields } from '@/lib/classroom';
import { arrayUnionValue } from '@/lib/studentWrites';
import { setActiveStudent } from '@/lib/session';
import { generateUsername } from '@/lib/usernames';
import {
  createStaircase,
  isCorrectAnswer,
  nextStaircaseState,
  pickQuestion,
  resultFromStaircase,
  runStaircase,
  skippedPlacement,
  type PlacementQuestion,
  type PlacementResult,
} from '@/lib/placement';
import { PLANET_LEVEL_LIST, getPlanetLevel } from '@/lib/planetLevels';
import {
  getLessonForPlanet,
  PLANET_ORDER,
  planetsBefore,
  type PlanetId,
} from '@/lib/planets';
import {
  SOLO_CLASS_CODE,
  clearSoloPending,
  createSoloProgress,
  loadSoloPending,
  saveSoloProgress,
  soloProgressToStudent,
} from '@/lib/solo';
import {
  clearClassPlacementPending,
  loadClassPlacementPending,
} from '@/lib/placementSession';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';
import { hapticTap } from '@/lib/haptics';
import BandCheckPage from '@/pages/BandCheckPage';
import { isDemoMode } from '@/lib/demo/mode';
import { loadActiveLearner, saveActiveLearner } from '@/lib/paths/activeLearner';
import { appendAssessment } from '@/lib/paths/progress';
import { FOUNDATION_BANDS, summarizeBands } from '@/lib/placementBands';

const FoundationsLevelCheck: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'class' ? 'class' : 'solo';
  const { hydrateFromStudent, hydrateClassMax } = useGame();
  const check = useAnswerCheck();

  const soloPending = useMemo(() => loadSoloPending(), []);
  const classPending = useMemo(() => loadClassPlacementPending(), []);

  const displayName = useMemo(() => {
    if (mode === 'class') return classPending?.displayName || generateUsername();
    return soloPending?.displayName || generateUsername();
  }, [mode, soloPending, classPending]);

  const [staircase, setStaircase] = useState(() => createStaircase());
  const [usedIds, setUsedIds] = useState<Set<string>>(() => new Set());
  const [question, setQuestion] = useState<PlacementQuestion>(() =>
    pickQuestion(createStaircase(), new Set())
  );
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [pickingPlanet, setPickingPlanet] = useState(false);
  const [unreadableReason, setUnreadableReason] = useState<UnreadableReason | null>(null);
  const [saving, setSaving] = useState(false);

  const finishWith = async (placement: PlacementResult, chosen?: PlanetId) => {
    const startPlanet = chosen ?? placement.startPlanet;
    const level = getPlanetLevel(startPlanet);
    // Unlock at least through the chosen start so exploration of earlier worlds
    // stays open; next planet opens when they finish (solo progression).
    const unlockPlanet =
      placement.unlockPlanet &&
      PLANET_ORDER.indexOf(placement.unlockPlanet) > PLANET_ORDER.indexOf(startPlanet)
        ? placement.unlockPlanet
        : startPlanet;

    setSaving(true);
    try {
      if (mode === 'class' && classPending) {
        const key = nicknameKey(classPending.nickname);
        await patchStudentFields(classPending.classCode, key, {
          planet: startPlanet,
          lesson: getLessonForPlanet(startPlanet),
          completedPlanets: arrayUnionValue(...planetsBefore(startPlanet)),
        });
        hydrateFromStudent({
          nickname: classPending.displayName,
          planet: startPlanet,
          lesson: getLessonForPlanet(startPlanet),
          completedPlanets: planetsBefore(startPlanet),
          planetSteps: {},
          lastUpdated: Date.now(),
        });
        setActiveStudent({
          classCode: classPending.classCode,
          nickname: key,
          displayName: classPending.displayName,
        });
        clearClassPlacementPending();
      } else {
        const progress = createSoloProgress(
          displayName,
          unlockPlanet,
          startPlanet,
          { pin: soloPending?.pin, placementDone: true }
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
        clearSoloPending();
      }
      try {
        const loaded = await loadActiveLearner();
        if (loaded) {
          const summary = summarizeBands(FOUNDATION_BANDS, placement.clearedLevelIndex, Date.now());
          summary.recommendedPathId = 'foundations';
          summary.recommendedNodeId = startPlanet;
          await saveActiveLearner(appendAssessment(loaded.record, summary));
        }
      } catch (error) {
        console.error('Could not save assessment', error);
      }
      setResult({
        ...placement,
        startPlanet,
        unlockPlanet,
        labelKey: level.labelKey,
      });
    } finally {
      setSaving(false);
    }
  };

  const advance = (outcome: 'correct' | 'incorrect' | 'unreadable') => {
    const next = nextStaircaseState(staircase, outcome);
    if (outcome === 'unreadable') {
      setStaircase(next);
      return;
    }
    const nextUsed = new Set(usedIds);
    nextUsed.add(question.id);
    setUsedIds(nextUsed);
    setStaircase(next);
    check.reset();
    setUnreadableReason(null);
    if (next.done) {
      void finishWith(resultFromStaircase(next));
      return;
    }
    setQuestion(pickQuestion(next, nextUsed));
  };

  const chooseTap = (value: number) => {
    if (result || saving) return;
    hapticTap();
    advance(isCorrectAnswer(question, value) ? 'correct' : 'incorrect');
  };

  const handleDraw = (read: DigitRead) => {
    if (result || saving) return;
    if (read.status === 'unreadable') {
      setUnreadableReason(read.reason ?? 'low_confidence');
      check.submit('unreadable');
      advance('unreadable');
      return;
    }
    setUnreadableReason(null);
    const ok = isCorrectAnswer(question, read.digit);
    check.submit(ok ? 'correct' : 'incorrect');
    // Brief pause so the child sees the check state, then advance without revealing the answer.
    window.setTimeout(() => advance(ok ? 'correct' : 'incorrect'), 450);
  };

  const handleTyped = (value: number) => {
    handleDraw({
      status: 'ok',
      digit: value,
      confidence: 1,
      reversal: false,
      strokeCount: 0,
      startQuadrant: 0,
      parts: String(value)
        .split('')
        .map((d) => Number(d)),
    });
  };

  const skipAll = () => {
    void finishWith(skippedPlacement());
  };

  const goHub = () => {
    navigate(STUDENT_HUB_PATH, { replace: true });
  };

  const acceptRecommended = () => {
    goHub();
  };

  const chooseOtherPlanet = async (planetId: PlanetId) => {
    if (!result) return;
    await finishWith(result, planetId);
    navigate(STUDENT_HUB_PATH, { replace: true });
  };

  if (result) {
    const startName = tx(`ui:planet_${result.startPlanet}`);
    const label = tx(`ui:${result.labelKey}`);
    return (
      <div className="min-h-screen bg-background subtle-stars flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md bg-card/95 p-6 rounded-2xl shadow-lg border border-border animate-fade-in">
          <h2 className="text-2xl font-semibold mb-2">{tx('ui:place_doneTitle')}</h2>
          <p className="text-muted-foreground mb-4">{tx(`ui:${result.summaryKey}`)}</p>
          <div className="rounded-xl border border-border bg-background/60 p-4 mb-6 space-y-2">
            <p className="text-base font-medium">
              {tx('ui:place_startsAt', { label })}
            </p>
            <p className="text-sm text-muted-foreground">
              {tx('ui:place_startAt', {
                planet: startName,
                topic: tx(`ui:topic_${getLessonForPlanet(result.startPlanet)}`),
              })}
            </p>
            <p className="text-sm text-muted-foreground">{tx('ui:place_exploreFree')}</p>
          </div>

          {!pickingPlanet ? (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                size="lg"
                className="w-full min-h-[48px]"
                onClick={acceptRecommended}
                disabled={saving}
              >
                {tx('ui:place_accept')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full min-h-[48px]"
                onClick={() => setPickingPlanet(true)}
                disabled={saving}
              >
                {tx('ui:place_chooseOther')}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">{tx('ui:place_pickPlanet')}</p>
              <ul className="max-h-72 overflow-y-auto space-y-2">
                {PLANET_LEVEL_LIST.map((info) => (
                  <li key={info.id}>
                    <button
                      type="button"
                      onClick={() => void chooseOtherPlanet(info.id)}
                      className="w-full text-start px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted min-h-[48px]"
                    >
                      {tx(`ui:${info.labelKey}`)}
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setPickingPlanet(false)}
              >
                {tx('ui:s_77dfd2135f')}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const dotsShown = question.dots != null ? Math.min(question.dots, 20) : 0;

  return (
    <div className="min-h-screen bg-background subtle-stars flex items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md bg-card/95 p-6 rounded-2xl shadow-lg border border-border animate-fade-in">
        <p className="text-sm text-muted-foreground mb-2">
          {tx('ui:place_for', { name: displayName })}
        </p>
        <h2 className="text-2xl font-semibold mb-2">{tx('ui:place_title')}</h2>
        <p className="text-muted-foreground mb-6">{tx('ui:place_lead')}</p>

        <p className="text-xs font-medium tracking-wide text-muted-foreground mb-3">
          {tx('ui:place_step', {
            step: Math.min(staircase.itemsAnswered + 1, staircase.config.maxItems),
            total: staircase.config.maxItems,
          })}
        </p>
        <p className="text-lg font-medium mb-4">{tx(`ui:${question.promptKey}`)}</p>

        {dotsShown > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6" aria-hidden>
            {Array.from({ length: dotsShown }, (_, i) => (
              <span
                key={i}
                className="inline-block w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-400/90"
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
              onClick={() => chooseTap(choice)}
              disabled={saving || check.state.inFlight}
              className="min-h-[56px] rounded-xl border border-border bg-background text-xl font-semibold hover:bg-emerald-500/15 hover:border-emerald-500/40 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {choice}
            </button>
          ))}
        </div>

        <div className="mb-6 rounded-xl border border-border bg-background/50 p-3">
          <p className="text-sm text-muted-foreground mb-3 text-center">{tx('ui:place_orDraw')}</p>
          <NumberDraw
            key={question.id}
            prompt=""
            result={check.state.verdict}
            unreadableReason={unreadableReason}
            checkEnabled={check.canSubmit(true)}
            disabled={saving}
            showTypeHint={check.state.unreadableStreak >= 3}
            onChange={() => check.noteChange()}
            onRead={handleDraw}
            onTyped={handleTyped}
          />
        </div>

        <div className="flex flex-wrap justify-between gap-3">
          <AuthNavButton
            onClick={() => navigate(mode === 'class' ? '/student-register' : '/solo')}
          />
          <button
            type="button"
            onClick={skipAll}
            className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            {tx('ui:place_skip')}
          </button>
          {isDemoMode() && (
            <button
              type="button"
              data-testid="demo-fast-forward"
              className="text-sm underline underline-offset-2 min-h-[44px]"
              onClick={() => void finishWith(runStaircase(['correct']).result)}
            >
              {tx('paths:demoFast')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const LevelCheckPage: React.FC = () => {
  const [params] = useSearchParams();
  const pathParam = params.get('path');
  if (pathParam && pathParam !== 'foundations') {
    return <BandCheckPage pathId={pathParam} />;
  }
  return <FoundationsLevelCheck />;
};

export default LevelCheckPage;
