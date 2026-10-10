import { tx } from '@/i18n/tx';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PATHS } from '@/content/catalog';
import type { Assignment, Curriculum, CurriculumNode, Problem } from '@/content/types';
import { Button } from '@/components/ui/button';
import { getPort } from '@/lib/data/port';
import {
  duplicatePath,
  moveNode,
  splitNode,
  validateCurriculum,
  type CurriculumIssue,
} from '@/lib/curriculum/logic';
import { exampleNumbersDiffer, leaksAnswer } from '@/lib/paths/text';
import { getClass } from '@/lib/classroom';

const blankProblem = (id: string): Problem => ({
  id,
  type: 'numeric',
  prompt: '',
  answer: '',
  hints: ['', '', ''],
  difficulty: 1,
  topics: ['custom'],
});

const blankCurriculum = (classCode: string): Curriculum => ({
  id: `cur-${Date.now()}`,
  classCode,
  name: '',
  status: 'draft',
  updatedAt: Date.now(),
  nodes: [
    {
      id: `node-${Date.now()}`,
      order: 1,
      title: '',
      prerequisites: [],
      topics: ['custom'],
      masteryThreshold: 80,
      extraPractice: 0,
      source: { kind: 'authored', problems: [blankProblem('p1'), blankProblem('p2'), blankProblem('p3')] },
    },
  ],
});

const draftKey = (classCode: string, id: string) => `mathlift:curriculum-draft:${classCode}:${id}`;

const CurriculumPage = () => {
  const { classCode = '' } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState<Curriculum[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<string[]>([]);
  const [current, setCurrent] = useState<Curriculum | null>(null);
  const [issues, setIssues] = useState<CurriculumIssue[]>([]);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [dirty, setDirty] = useState(false);
  const [studentKey, setStudentKey] = useState('');

  const load = async () => {
    setError('');
    try {
      const port = getPort(classCode, false);
      const [curricula, assigned, cls] = await Promise.all([
        port.listCurricula(classCode),
        port.listAssignments(classCode),
        getClass(classCode),
      ]);
      setList(curricula);
      setAssignments(assigned);
      setStudents(Object.keys(cls?.students ?? {}));
    } catch (err) {
      setError(err instanceof Error ? err.message : tx('paths:currError'));
    }
  };

  useEffect(() => {
    void load();
    const onOff = () => setOffline(!navigator.onLine);
    window.addEventListener('online', onOff);
    window.addEventListener('offline', onOff);
    return () => {
      window.removeEventListener('online', onOff);
      window.removeEventListener('offline', onOff);
    };
  }, [classCode]);

  useEffect(() => {
    if (!current || !dirty) return;
    const handle = window.setTimeout(() => {
      localStorage.setItem(draftKey(classCode, current.id), JSON.stringify(current));
    }, 400);
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => {
      window.clearTimeout(handle);
      window.removeEventListener('beforeunload', guard);
    };
  }, [current, dirty, classCode]);

  const update = (next: Curriculum) => {
    setCurrent({ ...next, updatedAt: Date.now() });
    setDirty(true);
    setIssues(validateCurriculum(next));
  };

  const save = async (status: 'draft' | 'published') => {
    if (!current) return;
    const next = { ...current, status, updatedAt: Date.now() };
    const found = validateCurriculum(next);
    setIssues(found);
    if (status === 'published' && found.length > 0) return;
    try {
      await getPort(classCode, false).saveCurriculum(next);
      localStorage.removeItem(draftKey(classCode, next.id));
      setDirty(false);
      setCurrent(next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx('paths:currError'));
    }
  };

  const assign = async (scope: Assignment['scope'], mode: Assignment['mode']) => {
    if (!current) return;
    const assignment: Assignment = {
      id: `as-${scope.kind}-${scope.kind === 'student' ? scope.studentKey : 'class'}-${current.id}`,
      curriculumId: current.id,
      scope,
      mode,
      updatedAt: Date.now(),
    };
    await getPort(classCode, false).saveAssignment(classCode, assignment);
    await load();
  };

  const removeCurriculum = async (id: string) => {
    await getPort(classCode, false).deleteCurriculum(classCode, id);
    if (current?.id === id) setCurrent(null);
    await load();
  };

  const issueText = useMemo(() => issues.map((issue) => tx(`paths:issue_${issue}`)), [issues]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">{tx('paths:currTitle')}</h1>
          <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => navigate(`/teacher/${classCode}`)}>
            {tx('paths:resultAccept')}
          </Button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{tx('paths:currSoloNote')}</p>
        {offline && <p className="mb-3 rounded-xl border border-border p-3">{tx('paths:currOffline')}</p>}
        {error && <p className="mb-3 rounded-xl border border-destructive/40 p-3">{tx('paths:currError')}</p>}
        {dirty && <p className="mb-3 text-sm">{tx('paths:currUnsaved')}</p>}
        {!current && list.length === 0 && !error && <p className="mb-4">{tx('paths:currEmpty')}</p>}
        {!current && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Button type="button" className="min-h-[48px]" onClick={() => update(blankCurriculum(classCode))}>{tx('paths:currCreate')}</Button>
            <label className="text-sm">
              <span className="mb-1 block">{tx('paths:currDuplicate')}</span>
              <select
                data-testid="duplicate-path"
                className="min-h-[48px] rounded-xl border border-border bg-background px-3"
                defaultValue=""
                onChange={(event) => {
                  const path = PATHS.find((item) => item.id === event.target.value);
                  if (!path) return;
                  update(duplicatePath(path, classCode, `dup-${path.id}-${Date.now()}`, tx(path.titleKey)));
                }}
              >
                <option value="">{tx('paths:defaultPath')}</option>
                {PATHS.map((path) => (
                  <option key={path.id} value={path.id}>{tx(path.titleKey)}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        {!current && (
          <ul className="space-y-2">
            {list.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
                <span>{item.name}</span>
                <span className="flex gap-2">
                  <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => { setCurrent(item); setIssues(validateCurriculum(item)); }}>{tx('paths:currEdit')}</Button>
                  <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => void removeCurriculum(item.id)}>{tx('paths:currDelete')}</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {current && (
          <Editor
            curriculum={current}
            issues={issueText}
            students={students}
            studentKey={studentKey}
            onStudentKey={setStudentKey}
            onChange={update}
            onSave={() => void save('published')}
            onDraft={() => void save('draft')}
            onAssignClass={(mode) => void assign({ kind: 'class' }, mode)}
            onAssignStudent={(mode) => studentKey && void assign({ kind: 'student', studentKey }, mode)}
            onPreview={(nodeId) => navigate(`/play/c/${current.id}/${nodeId}?preview=1`)}
            onClose={() => {
              if (dirty && !window.confirm(tx('paths:currUnsaved'))) return;
              setCurrent(null);
              setDirty(false);
            }}
          />
        )}
        {assignments.length > 0 && !current && (
          <p className="mt-4 text-sm text-muted-foreground">{tx('paths:currAssigned')}: {assignments.length}</p>
        )}
      </div>
    </div>
  );
};

const Editor = ({
  curriculum,
  issues,
  students,
  studentKey,
  onStudentKey,
  onChange,
  onSave,
  onDraft,
  onAssignClass,
  onAssignStudent,
  onPreview,
  onClose,
}: {
  curriculum: Curriculum;
  issues: string[];
  students: string[];
  studentKey: string;
  onStudentKey: (value: string) => void;
  onChange: (next: Curriculum) => void;
  onSave: () => void;
  onDraft: () => void;
  onAssignClass: (mode: Assignment['mode']) => void;
  onAssignStudent: (mode: Assignment['mode']) => void;
  onPreview: (nodeId: string) => void;
  onClose: () => void;
}) => {
  const [drag, setDrag] = useState<number | null>(null);
  const patchNode = (index: number, node: CurriculumNode) => {
    const nodes = curriculum.nodes.map((item, itemIndex) => (itemIndex === index ? node : item));
    onChange({ ...curriculum, nodes });
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm">{tx('paths:currName')}</span>
        <input className="w-full rounded-xl border border-border bg-background px-3 py-3 min-h-[48px]" value={curriculum.name} onChange={(event) => onChange({ ...curriculum, name: event.target.value })} />
      </label>
      {issues.length > 0 && (
        <ul className="rounded-xl border border-border p-3 text-sm">
          {issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      )}
      <ul className="space-y-4">
        {curriculum.nodes.map((node, index) => (
          <li
            key={node.id}
            draggable
            onDragStart={() => setDrag(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (drag === null || drag === index) return;
              const direction = drag < index ? 1 : -1;
              let next = curriculum;
              let cursor = drag;
              while (cursor !== index) {
                next = moveNode(next, cursor, direction);
                cursor += direction;
              }
              onChange(next);
              setDrag(null);
            }}
            className="rounded-2xl border border-border p-4"
          >
            <label className="mb-2 block">
              <span className="mb-1 block text-sm">{tx('paths:currPlanet')}</span>
              <input className="w-full rounded-xl border border-border bg-background px-3 py-2 min-h-[48px]" value={node.title} onChange={(event) => patchNode(index, { ...node, title: event.target.value })} />
            </label>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="min-h-[48px]" aria-label={tx('paths:currUp')} onClick={() => onChange(moveNode(curriculum, index, -1))}>{tx('paths:currUp')}</Button>
              <Button type="button" variant="outline" className="min-h-[48px]" aria-label={tx('paths:currDown')} onClick={() => onChange(moveNode(curriculum, index, 1))}>{tx('paths:currDown')}</Button>
              <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => onChange(splitNode(curriculum, node.id))}>{tx('paths:currSplit')}</Button>
              <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => onPreview(node.id)}>{tx('paths:currPreview')}</Button>
              <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => onChange({ ...curriculum, nodes: curriculum.nodes.filter((item) => item.id !== node.id) })}>{tx('paths:currRemove')}</Button>
            </div>
            <label className="mb-2 block text-sm">
              {tx('paths:currThreshold')}
              <input type="number" min={50} max={100} className="ms-2 w-24 rounded-xl border border-border bg-background px-2 py-2" value={node.masteryThreshold} onChange={(event) => patchNode(index, { ...node, masteryThreshold: Number(event.target.value) })} />
            </label>
            <label className="mb-3 block text-sm">
              {tx('paths:currExtra')}
              <input type="number" min={0} max={10} className="ms-2 w-24 rounded-xl border border-border bg-background px-2 py-2" value={node.extraPractice ?? 0} onChange={(event) => patchNode(index, { ...node, extraPractice: Number(event.target.value) })} />
            </label>
            {node.source.problems.map((problem, problemIndex) => (
              <fieldset key={problem.id} className="mb-3 rounded-xl border border-border p-3">
                <legend className="px-1 text-sm">{tx('paths:currPrompt')}</legend>
                <textarea className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2" value={problem.prompt ?? ''} onChange={(event) => {
                  const problems = node.source.problems.map((item, itemIndex) => itemIndex === problemIndex ? { ...item, prompt: event.target.value } : item);
                  patchNode(index, { ...node, source: { kind: 'authored', problems } });
                }} />
                <label className="mb-2 block text-sm">
                  {tx('paths:currAnswer')}
                  <input className="ms-2 rounded-xl border border-border bg-background px-2 py-2" dir="ltr" value={problem.answer} onChange={(event) => {
                    const problems = node.source.problems.map((item, itemIndex) => itemIndex === problemIndex ? { ...item, answer: event.target.value } : item);
                    patchNode(index, { ...node, source: { kind: 'authored', problems } });
                  }} />
                </label>
                <label className="mb-2 block text-sm">
                  {tx('paths:currDifficulty')}
                  <select className="ms-2 rounded-xl border border-border bg-background px-2 py-2" value={problem.difficulty} onChange={(event) => {
                    const difficulty = Number(event.target.value) as Problem['difficulty'];
                    const problems = node.source.problems.map((item, itemIndex) => itemIndex === problemIndex ? { ...item, difficulty } : item);
                    patchNode(index, { ...node, source: { kind: 'authored', problems } });
                  }}>
                    {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  {tx('paths:currHints')}
                  <textarea className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={(problem.hints ?? []).join('\n')} onChange={(event) => {
                    const hints = event.target.value.split('\n');
                    const problems = node.source.problems.map((item, itemIndex) => itemIndex === problemIndex ? { ...item, hints } : item);
                    patchNode(index, { ...node, source: { kind: 'authored', problems } });
                  }} />
                </label>
                <label className="mt-2 block text-sm">
                  {tx('paths:currExample')}
                  <textarea className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={problem.workedExample?.prompt ?? ''} onChange={(event) => {
                    const workedExample = { prompt: event.target.value, steps: problem.workedExample?.steps ?? [] };
                    const problems = node.source.problems.map((item, itemIndex) => itemIndex === problemIndex ? { ...item, workedExample } : item);
                    patchNode(index, { ...node, source: { kind: 'authored', problems } });
                  }} />
                </label>
                {problem.hints && leaksAnswer(problem.hints, problem.answer) && <p className="text-sm">{tx('paths:issue_hint')}</p>}
                {!exampleNumbersDiffer(problem) && <p className="text-sm">{tx('paths:issue_example')}</p>}
              </fieldset>
            ))}
            <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => patchNode(index, { ...node, source: { kind: 'authored', problems: [...node.source.problems, blankProblem(`${node.id}-p${node.source.problems.length + 1}`)] } })}>
              {tx('paths:currAddProblem')}
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => onChange({
        ...curriculum,
        nodes: [...curriculum.nodes, {
          id: `node-${Date.now()}`,
          order: curriculum.nodes.length + 1,
          title: '',
          prerequisites: [],
          topics: ['custom'],
          masteryThreshold: 80,
          extraPractice: 0,
          source: { kind: 'authored', problems: [blankProblem('a'), blankProblem('b'), blankProblem('c')] },
        }],
      })}>{tx('paths:currAddPlanet')}</Button>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-[48px]" data-testid="curriculum-save" onClick={onSave}>{tx('paths:currSave')}</Button>
        <Button type="button" variant="outline" className="min-h-[48px]" onClick={onDraft}>{tx('paths:currSave')}</Button>
        <Button type="button" variant="ghost" className="min-h-[48px]" onClick={onClose}>{tx('paths:openPaths')}</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" data-testid="assign-class" variant="outline" className="min-h-[48px]" onClick={() => onAssignClass('alongside')}>{tx('paths:currAssignClass')}</Button>
        <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => onAssignClass('replace')}>{tx('paths:currReplace')}</Button>
        <label className="text-sm">
          <span className="mb-1 block">{tx('paths:currAssignStudent')}</span>
          <select className="min-h-[48px] rounded-xl border border-border bg-background px-3" value={studentKey} onChange={(event) => onStudentKey(event.target.value)}>
            <option value="">{tx('paths:noneYet')}</option>
            {students.map((key) => <option key={key} value={key}>{key}</option>)}
          </select>
        </label>
        <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => onAssignStudent('replace')}>{tx('paths:currReplace')}</Button>
        <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => onAssignStudent('alongside')}>{tx('paths:currAlongside')}</Button>
      </div>
    </div>
  );
};

export default CurriculumPage;
