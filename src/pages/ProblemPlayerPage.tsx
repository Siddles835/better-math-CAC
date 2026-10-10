import { tx } from '@/i18n/tx';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import GeometryDiagram from '@/components/GeometryDiagram';
import NumberDraw from '@/components/NumberDraw';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import { getPath } from '@/content/catalog';
import type { Curriculum, Problem } from '@/content/types';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useAnswerCheck } from '@/hooks/useAnswerCheck';
import { parseStudentAnswer } from '@/lib/answers/parse';
import { getPort } from '@/lib/data/port';
import { problemsForNode } from '@/lib/paths/generators';
import { loadActiveLearner, saveActiveLearner } from '@/lib/paths/activeLearner';
import { recordAttempt } from '@/lib/paths/progress';
import { getActiveStudent } from '@/lib/session';
import { nicknameKey } from '@/lib/classroom';

const promptText = (problem: Problem): string => {
  if (problem.prompt) return problem.prompt;
  if (problem.promptKey) return tx(problem.promptKey, problem.promptValues);
  return tx('paths:q_solve');
};

const hintText = (problem: Problem, index: number): string => {
  const authored = problem.hints?.[index];
  if (authored) return authored;
  const key = problem.hintKeys?.[index];
  return key ? tx(key) : '';
};

const ProblemPlayerPage = () => {
  const { pathId, nodeId, curriculumId } = useParams();
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';
  const navigate = useNavigate();
  const { prefs } = useAccessibility();
  const check = useAnswerCheck();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [index, setIndex] = useState(0);
  const [hints, setHints] = useState(0);
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState('');
  const [threshold, setThreshold] = useState(80);
  const [topics, setTopics] = useState<string[]>([]);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      if (curriculumId && nodeId) {
        const active = getActiveStudent();
        const port = getPort(active?.classCode, !!active?.solo);
        const list = active ? await port.listCurricula(active.classCode) : [];
        const found = list.find((item) => item.id === curriculumId) ?? null;
        const node = found?.nodes.find((item) => item.id === nodeId);
        if (cancel || !node) return;
        setCurriculum(found);
        setProblems(node.source.problems);
        setThreshold(node.masteryThreshold);
        setTopics(node.topics);
        return;
      }
      const path = getPath(pathId);
      const node = path?.nodes.find((item) => item.id === nodeId);
      if (!path || !node || node.source.kind === 'legacy') return;
      if (node.source.kind === 'authored') {
        setProblems(node.source.problems);
      } else {
        const active = getActiveStudent();
        const seed = nicknameKey(active?.nickname || 'guest').length * 1000 + node.order * 17;
        setProblems(
          problemsForNode(
            node.source.generatorId,
            node.source.tiers,
            node.source.perTier,
            seed,
            node.extraPractice ?? 0
          )
        );
      }
      setThreshold(node.masteryThreshold);
      setTopics(node.topics);
    })();
    return () => {
      cancel = true;
    };
  }, [pathId, nodeId, curriculumId]);

  const problem = problems[index];
  const spoken = useMemo(() => (problem ? `${promptText(problem)} ${problem.equation ?? ''}` : ''), [problem]);
  const digits = problem ? String(problem.answer).length : 0;
  const allowDraw = !!problem && digits <= 2 && problem.type !== 'multipleChoice' && prefs.answerMethod !== 'type';

  const grade = async (raw: string) => {
    if (!problem) return;
    const parsed = parseStudentAnswer(raw);
    if (parsed.status !== 'ok') {
      check.submit('unreadable');
      setNote(tx('paths:playUnreadable'));
      return;
    }
    const ok = parsed.value === Number(problem.answer);
    check.submit(ok ? 'correct' : 'incorrect');
    setNote(ok ? tx('paths:playCorrect') : tx('paths:playNotYet'));
    if (preview) return;
    const loaded = await loadActiveLearner();
    if (!loaded || !nodeId) return;
    if (curriculum && curriculumId) {
      const prev = loaded.record.curriculumProgress?.[curriculumId] ?? {
        currentNodeId: nodeId,
        completedNodeIds: [],
        nodeMastery: {},
        topicMastery: {},
      };
      const next = recordAttempt(prev, nodeId, topics, ok, threshold, Math.max(3, problems.length));
      await saveActiveLearner({
        ...loaded.record,
        curriculumProgress: { ...loaded.record.curriculumProgress, [curriculumId]: next },
      });
      return;
    }
    const path = getPath(pathId || '');
    if (!path) return;
    const prev = loaded.record.paths[path.id] ?? {
      currentNodeId: nodeId,
      completedNodeIds: [],
      nodeMastery: {},
      topicMastery: {},
    };
    const next = recordAttempt(prev, nodeId, topics, ok, threshold, Math.max(3, problems.length));
    const mastered = !!next.nodeMastery[nodeId]?.mastered;
    if (mastered) {
      const order = path.nodes.find((item) => item.id === nodeId)?.order ?? 0;
      const following = path.nodes.find((item) => item.order === order + 1);
      next.currentNodeId = following?.id ?? nodeId;
    }
    await saveActiveLearner({
      ...loaded.record,
      paths: { ...loaded.record.paths, [path.id]: next },
    });
  };

  const goNext = () => {
    if (!problem) return;
    if (index + 1 >= problems.length) {
      setDone(tx('paths:playMastered'));
      return;
    }
    setIndex(index + 1);
    setHints(0);
    setTyped('');
    setNote('');
    check.reset();
  };

  if (!problem) {
    return <div className="min-h-screen bg-background p-8 text-muted-foreground">{tx('paths:currEmpty')}</div>;
  }

  return (
    <div className="min-h-screen bg-background subtle-stars p-6">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6">
        {preview && <p className="mb-3 text-sm font-medium">{tx('paths:previewBanner')}</p>}
        <div className="mb-4 flex items-start justify-between gap-2">
          <h1 className="text-xl font-semibold">{promptText(problem)}</h1>
          <ReadAloudButton text={spoken} />
        </div>
        {problem.equation && (
          <p className="mb-4 text-center text-3xl font-semibold" dir="ltr">
            {problem.equation}
          </p>
        )}
        {problem.diagram && <GeometryDiagram diagram={problem.diagram} />}
        {problem.type === 'multipleChoice' && problem.choices && (
          <div className="my-4 grid grid-cols-2 gap-3">
            {problem.choices.map((choice) => (
              <button key={choice} type="button" className="min-h-[56px] rounded-xl border border-border text-xl" dir="ltr" onClick={() => void grade(choice)}>
                {choice}
              </button>
            ))}
          </div>
        )}
        {problem.type !== 'multipleChoice' && (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm">{tx('paths:playTypeLabel')}</span>
            <input
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
                check.noteChange();
              }}
              inputMode="numeric"
              dir="ltr"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-2xl min-h-[48px]"
            />
          </label>
        )}
        {allowDraw && (
          <NumberDraw
            key={problem.id}
            prompt=""
            result={check.state.verdict}
            checkEnabled={check.canSubmit(true)}
            onChange={() => check.noteChange()}
            onRead={(read) => {
              if (read.status !== 'ok') {
                check.submit('unreadable');
                setNote(tx('paths:playUnreadable'));
                return;
              }
              void grade(String(read.digit));
            }}
            onTyped={(value) => void grade(String(value))}
          />
        )}
        {note && <p className="my-3 text-sm">{note}</p>}
        {done && <p className="my-3">{done}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {problem.type !== 'multipleChoice' && (
            <Button type="button" className="min-h-[48px]" onClick={() => void grade(typed)}>
              {tx('paths:playSubmit')}
            </Button>
          )}
          <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => setHints((value) => Math.min(3, value + 1))}>
            {tx('paths:playHint')}
          </Button>
          <Button type="button" variant="outline" className="min-h-[48px]" onClick={goNext}>
            {tx('paths:playNext')}
          </Button>
          <Button type="button" variant="ghost" className="min-h-[48px]" onClick={() => navigate('/paths')}>
            {tx('paths:openPaths')}
          </Button>
        </div>
        {Array.from({ length: hints }, (_, hintIndex) => (
          <p key={hintIndex} className="mt-3 text-sm text-muted-foreground">{hintText(problem, hintIndex)}</p>
        ))}
        {hints > 0 && problem.workedExample && (
          <p className="mt-3 text-sm" dir="ltr">
            {problem.workedExample.prompt ||
              (problem.workedExample.promptKey ? tx(problem.workedExample.promptKey, problem.workedExample.promptValues) : '')}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProblemPlayerPage;
