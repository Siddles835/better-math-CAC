import { tx } from '@/i18n/tx';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import type { AssessmentSummary } from '@/content/types';
import { isDemoMode } from '@/lib/demo/mode';
import {
  clearPendingPath,
  loadActiveLearner,
  normalizePathId,
  saveActiveLearner,
} from '@/lib/paths/activeLearner';
import { appendAssessment, switchPath } from '@/lib/paths/progress';
import { buildAssessmentResultView } from '@/lib/assessmentLabels';
import {
  bandsForScope,
  questionForBand,
  runBandStaircase,
  skippedAssessment,
  summarizeBands,
} from '@/lib/placementBands';
import { createStaircase, nextStaircaseState, type PlacementQuestion, type StaircaseState } from '@/lib/placement';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';
import { generateUsername } from '@/lib/usernames';
import { nicknameKey, patchStudentFields } from '@/lib/classroom';
import { arrayUnionValue } from '@/lib/studentWrites';
import { getActiveStudent, setActiveStudent } from '@/lib/session';
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
import {
  PLANET_ORDER,
  getLessonForPlanet,
  normalizePlanetId,
  planetsBefore,
  type PlanetId,
} from '@/lib/planets';
import { useGame } from '@/context/GameContext';

const STORE = 'mathlift:band-check';

const BandCheckPage = ({ pathId }: { pathId: string }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { hydrateFromStudent, hydrateClassMax } = useGame();
  const bands = useMemo(() => bandsForScope(pathId), [pathId]);
  const [state, setState] = useState<StaircaseState>(() =>
    createStaircase({ minItems: Math.min(12, bands.length * 2), maxItems: Math.max(12, bands.length * 2) }, bands.length)
  );
  const [itemIndex, setItemIndex] = useState(0);
  const [usedIds, setUsedIds] = useState<Set<string>>(() => new Set());
  const [question, setQuestion] = useState<PlacementQuestion>(() => questionForBand(bands[0], 0, new Set()));
  const [summary, setSummary] = useState<AssessmentSummary | null>(null);
  const mode = params.get('mode') === 'class' ? 'class' : 'solo';

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        pathId: string;
        state: StaircaseState;
        itemIndex: number;
        usedIds?: string[];
      };
      if (saved.pathId !== pathId || saved.state.done) return;
      const restoredUsed = new Set(saved.usedIds ?? []);
      setState(saved.state);
      setItemIndex(saved.itemIndex);
      setUsedIds(restoredUsed);
      setQuestion(
        questionForBand(
          bands[Math.min(saved.state.levelIndex, bands.length - 1)],
          saved.itemIndex,
          restoredUsed
        )
      );
    } catch {
      /* ignore a broken pause */
    }
  }, [pathId, bands]);

  const persist = (next: StaircaseState, nextItem: number, nextUsed: Set<string>) => {
    sessionStorage.setItem(
      STORE,
      JSON.stringify({ pathId, state: next, itemIndex: nextItem, usedIds: [...nextUsed] })
    );
  };

  const ensureSession = async (result: AssessmentSummary) => {
    if (getActiveStudent()) return;

    const startPlanet: PlanetId =
      normalizePlanetId(result.recommendedNodeId) ??
      (result.recommendedPathId === 'foundations' ? 'sun' : 'sun');
    const unlockPlanet =
      PLANET_ORDER.indexOf(startPlanet) >= 0 ? startPlanet : 'sun';

    if (mode === 'class') {
      const classPending = loadClassPlacementPending();
      if (!classPending) return;
      const key = nicknameKey(classPending.nickname);
      try {
        await patchStudentFields(classPending.classCode, key, {
          planet: unlockPlanet,
          lesson: getLessonForPlanet(unlockPlanet),
          completedPlanets: arrayUnionValue(...planetsBefore(unlockPlanet)),
        });
      } catch (error) {
        console.error('Could not patch class placement', error);
      }
      hydrateFromStudent({
        nickname: classPending.displayName,
        planet: unlockPlanet,
        lesson: getLessonForPlanet(unlockPlanet),
        completedPlanets: planetsBefore(unlockPlanet),
        planetSteps: {},
        lastUpdated: Date.now(),
      });
      setActiveStudent({
        classCode: classPending.classCode,
        nickname: key,
        displayName: classPending.displayName,
      });
      clearClassPlacementPending();
      return;
    }

    const soloPending = loadSoloPending();
    const displayName = soloPending?.displayName || generateUsername();
    const progress = createSoloProgress(displayName, unlockPlanet, unlockPlanet, {
      pin: soloPending?.pin,
      placementDone: true,
    });
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
  };

  const finish = async (result: AssessmentSummary) => {
    sessionStorage.removeItem(STORE);
    try {
      await ensureSession(result);
      const loaded = await loadActiveLearner();
      if (loaded) {
        const nextPath = normalizePathId(result.recommendedPathId);
        let record = appendAssessment(loaded.record, {
          ...result,
          at: Date.now(),
          id: `assess-${Date.now()}`,
          recommendedPathId: nextPath,
        });
        record = switchPath(record, nextPath);
        await saveActiveLearner(record);
      }
    } catch (error) {
      console.error('Could not save band check result', error);
    } finally {
      clearPendingPath();
      setSummary(result);
    }
  };

  const answer = (value: number | 'skip') => {
    if (value === 'skip') {
      void finish(skippedAssessment(Date.now()));
      return;
    }
    const outcome = value === question.answer ? 'correct' : 'incorrect';
    const next = nextStaircaseState(state, outcome);
    const nextUsed = new Set(usedIds);
    nextUsed.add(question.id);
    const nextItem = itemIndex + 1;
    if (next.done) {
      void finish(summarizeBands(bands, next.clearedLevelIndex, Date.now()));
      return;
    }
    const nextQuestion = questionForBand(bands[next.levelIndex] ?? bands[0], nextItem, nextUsed);
    // If the ladder froze and we would only re-show a used item, end the check.
    if (next.stopHarder && nextUsed.has(nextQuestion.id)) {
      void finish(summarizeBands(bands, next.clearedLevelIndex, Date.now()));
      return;
    }
    setState(next);
    setItemIndex(nextItem);
    setUsedIds(nextUsed);
    setQuestion(nextQuestion);
    persist(next, nextItem, nextUsed);
  };

  const fast = () => {
    const ran = runBandStaircase(bands.length, ['correct'], { maxItems: bands.length * 2, minItems: 4 });
    void finish(summarizeBands(bands, ran.clearedLevelIndex, Date.now()));
  };

  if (summary) {
    const view = buildAssessmentResultView(summary, bands);
    return (
      <div className="min-h-screen bg-background p-6" data-testid="assessment-result">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6">
          <h1 className="mb-3 text-2xl font-semibold">{tx('paths:resultTitle')}</h1>
          <p className="mb-6 text-base leading-relaxed">
            {tx('paths:resultRecommend', { path: view.pathTitle, step: view.stepTitle })}
          </p>

          <section className="mb-5">
            <h2 className="mb-2 font-semibold">{tx('paths:resultStrength')}</h2>
            {view.strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx('paths:noneYet')}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {view.strengths.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-5">
            <h2 className="mb-2 font-semibold">{tx('paths:resultPractice')}</h2>
            {view.practice.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx('paths:noneYet')}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {view.practice.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-200" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-6">
            <h2 className="mb-3 font-semibold">{tx('paths:perPath')}</h2>
            <ul className="space-y-3">
              {view.pathRows.map((row) => (
                <li key={row.pathId} className="rounded-xl border border-border/70 bg-background/40 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{row.pathTitle}</p>
                    <span className="flex items-center gap-1" aria-hidden>
                      {[1, 2, 3].map((tier) => (
                        <span
                          key={tier}
                          className={`h-2 w-2 rounded-full ${
                            tier <= row.tiersCleared ? 'bg-sky-300' : 'bg-muted'
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.checked
                      ? tx('paths:resultClearedThrough', { step: row.stepTitle })
                      : tx('paths:resultNotChecked')}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <Button type="button" className="min-h-[48px] w-full" onClick={() => navigate(STUDENT_HUB_PATH)}>
            {tx('paths:resultAccept')}
          </Button>
        </div>
      </div>
    );
  }

  const promptKey =
    question.promptKey.startsWith('paths:') || question.promptKey.startsWith('ui:')
      ? question.promptKey
      : `ui:${question.promptKey}`;
  const dotsShown = question.dots != null && question.dots > 0 ? Math.min(question.dots, 40) : 0;
  // Do not speak the equation when dots are shown (that would give away the count).
  const spoken = `${tx(promptKey)}${dotsShown > 0 || !question.equation ? '' : ` ${question.equation}`}`;

  return (
    <div className="min-h-screen bg-background p-6" data-testid="band-level-check">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{tx('paths:resultTitle')}</h1>
          <ReadAloudButton text={spoken} />
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{tx('paths:resultPause')}</p>
        <p className="mb-4 text-lg">{tx(promptKey)}</p>
        {dotsShown > 0 && (
          <div
            className="mb-6 flex flex-wrap justify-center gap-2.5"
            data-testid="level-check-dots"
            role="img"
            aria-label={tx(promptKey)}
          >
            {Array.from({ length: dotsShown }, (_, i) => (
              <span
                key={i}
                className="inline-block h-5 w-5 shrink-0 rounded-full bg-amber-200 shadow-sm sm:h-6 sm:w-6"
              />
            ))}
          </div>
        )}
        {question.equation && dotsShown === 0 && (
          <p className="mb-4 text-center text-3xl" dir="ltr">
            {question.equation}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {question.choices.map((choice) => (
            <button key={choice} type="button" className="min-h-[56px] rounded-xl border border-border text-xl" dir="ltr" onClick={() => answer(choice)}>
              {choice}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="min-h-[44px] text-sm underline" onClick={() => answer('skip')}>{tx('ui:place_skip')}</button>
          {isDemoMode() && (
            <button type="button" data-testid="demo-fast-forward" className="min-h-[44px] text-sm underline" onClick={fast}>
              {tx('paths:demoFast')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BandCheckPage;
