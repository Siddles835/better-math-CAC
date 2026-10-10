import { tx } from '@/i18n/tx';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import type { AssessmentSummary } from '@/content/types';
import { isDemoMode } from '@/lib/demo/mode';
import { loadActiveLearner, saveActiveLearner } from '@/lib/paths/activeLearner';
import { appendAssessment, switchPath } from '@/lib/paths/progress';
import {
  bandsForScope,
  questionForBand,
  runBandStaircase,
  skippedAssessment,
  summarizeBands,
} from '@/lib/placementBands';
import { createStaircase, nextStaircaseState, type PlacementQuestion, type StaircaseState } from '@/lib/placement';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';
import { getPath } from '@/content/catalog';

const STORE = 'mathlift:band-check';

const BandCheckPage = ({ pathId }: { pathId: string }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const bands = useMemo(() => bandsForScope(pathId), [pathId]);
  const [state, setState] = useState<StaircaseState>(() =>
    createStaircase({ minItems: Math.min(12, bands.length * 2), maxItems: Math.max(12, bands.length * 2) }, bands.length)
  );
  const [itemIndex, setItemIndex] = useState(0);
  const [question, setQuestion] = useState<PlacementQuestion>(() => questionForBand(bands[0], 0));
  const [summary, setSummary] = useState<AssessmentSummary | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE);
      if (!raw) return;
      const saved = JSON.parse(raw) as { pathId: string; state: StaircaseState; itemIndex: number };
      if (saved.pathId !== pathId || saved.state.done) return;
      setState(saved.state);
      setItemIndex(saved.itemIndex);
      setQuestion(questionForBand(bands[Math.min(saved.state.levelIndex, bands.length - 1)], saved.itemIndex));
    } catch {
      /* ignore a broken pause */
    }
  }, [pathId, bands]);

  const persist = (next: StaircaseState, nextItem: number) => {
    sessionStorage.setItem(STORE, JSON.stringify({ pathId, state: next, itemIndex: nextItem }));
  };

  const finish = async (result: AssessmentSummary) => {
    sessionStorage.removeItem(STORE);
    const loaded = await loadActiveLearner();
    if (loaded) {
      let record = appendAssessment(loaded.record, { ...result, at: Date.now(), id: `assess-${Date.now()}` });
      if (result.recommendedPathId && result.recommendedPathId !== 'all') {
        record = switchPath(record, result.recommendedPathId);
      }
      await saveActiveLearner(record);
    }
    setSummary(result);
  };

  const answer = (value: number | 'skip') => {
    if (value === 'skip') {
      void finish(skippedAssessment(Date.now()));
      return;
    }
    const outcome = value === question.answer ? 'correct' : 'incorrect';
    const next = nextStaircaseState(state, outcome);
    const nextItem = itemIndex + 1;
    if (next.done) {
      void finish(summarizeBands(bands, next.clearedLevelIndex, Date.now()));
      return;
    }
    setState(next);
    setItemIndex(nextItem);
    setQuestion(questionForBand(bands[next.levelIndex] ?? bands[0], nextItem));
    persist(next, nextItem);
  };

  const fast = () => {
    const ran = runBandStaircase(bands.length, ['correct'], { maxItems: bands.length * 2, minItems: 4 });
    void finish(summarizeBands(bands, ran.clearedLevelIndex, Date.now()));
  };

  if (summary) {
    const path = getPath(summary.recommendedPathId);
    return (
      <div className="min-h-screen bg-background p-6" data-testid="assessment-result">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6">
          <h1 className="mb-3 text-2xl font-semibold">{tx('paths:resultTitle')}</h1>
          <p className="mb-3">{tx('paths:resultRecommend', { path: path ? tx(path.titleKey) : summary.recommendedPathId, planet: summary.recommendedNodeId })}</p>
          <h2 className="font-semibold">{tx('paths:resultStrength')}</h2>
          <p className="mb-3 text-sm">{summary.strengths.join(', ') || tx('paths:noneYet')}</p>
          <h2 className="font-semibold">{tx('paths:resultPractice')}</h2>
          <p className="mb-3 text-sm">{summary.practiceTopics.join(', ') || tx('paths:noneYet')}</p>
          <h2 className="mb-2 font-semibold">{tx('paths:perPath')}</h2>
          <ul className="mb-4 space-y-1 text-sm">
            {Object.entries(summary.byPath).map(([id, info]) => (
              <li key={id} dir="ltr">{id}: {info.clearedBandId ?? tx('paths:resultNotChecked')}</li>
            ))}
          </ul>
          <Button type="button" className="min-h-[48px] w-full" onClick={() => navigate(STUDENT_HUB_PATH)}>
            {tx('paths:resultAccept')}
          </Button>
        </div>
      </div>
    );
  }

  const spoken = `${tx(question.promptKey.startsWith('paths:') || question.promptKey.startsWith('ui:') ? question.promptKey : `ui:${question.promptKey}`)} ${question.equation ?? ''}`;
  const mode = params.get('mode') === 'class' ? 'class' : 'solo';
  void mode;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{tx('paths:resultTitle')}</h1>
          <ReadAloudButton text={spoken} />
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{tx('paths:resultPause')}</p>
        <p className="mb-4 text-lg">{tx(question.promptKey.startsWith('paths:') ? question.promptKey : `ui:${question.promptKey}`)}</p>
        {question.equation && <p className="mb-4 text-center text-3xl" dir="ltr">{question.equation}</p>}
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
