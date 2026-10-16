import { tx } from '@/i18n/tx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  Split,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { PATHS } from '@/content/catalog';
import type { Assignment, Curriculum, CurriculumNode, Problem } from '@/content/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { getPort } from '@/lib/data/port';
import {
  blankProblem,
  canSplitNode,
  duplicatePath,
  MAX_PROBLEMS,
  MIN_PROBLEMS,
  moveNode,
  renumber,
  splitNode,
  validateCurriculum,
  type CurriculumIssue,
} from '@/lib/curriculum/logic';
import {
  countProblems,
  hydrateCurriculum,
  nodeHasProblems,
  problemFieldIssues,
  type ProblemFieldIssue,
} from '@/lib/curriculum/hydrate';
import { getClass } from '@/lib/classroom';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

const blankNode = (id: string): CurriculumNode => ({
  id,
  order: 1,
  title: '',
  prerequisites: [],
  topics: ['custom'],
  masteryThreshold: 80,
  extraPractice: 0,
  source: {
    kind: 'authored',
    problems: [blankProblem(`${id}-a`), blankProblem(`${id}-b`), blankProblem(`${id}-c`)],
  },
});

const blankCurriculum = (classCode: string): Curriculum => ({
  id: `cur-${Date.now()}`,
  classCode,
  name: '',
  status: 'draft',
  updatedAt: Date.now(),
  nodes: [blankNode(`node-${Date.now()}`)],
});

const draftKey = (classCode: string, id: string) => `mathlift:curriculum-draft:${classCode}:${id}`;

const StatusPill = ({
  tone,
  children,
}: {
  tone: 'muted' | 'warn' | 'ok';
  children: React.ReactNode;
}) => (
  <span
    className={cn(
      'inline-flex min-h-[32px] items-center rounded-full border px-3 text-sm',
      tone === 'muted' && 'border-border text-muted-foreground',
      tone === 'warn' && 'border-destructive/40 text-destructive',
      tone === 'ok' && 'border-border text-success'
    )}
  >
    {children}
  </span>
);

const CurriculumPage = () => {
  const { classCode = '' } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState<Curriculum[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<string[]>([]);
  const [current, setCurrent] = useState<Curriculum | null>(null);
  const [issues, setIssues] = useState<CurriculumIssue[]>([]);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [dirty, setDirty] = useState(false);
  const [studentKey, setStudentKey] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [publishAttempted, setPublishAttempted] = useState(false);

  const load = useCallback(async () => {
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
  }, [classCode]);

  useEffect(() => {
    void load();
    const onOff = () => setOffline(!navigator.onLine);
    window.addEventListener('online', onOff);
    window.addEventListener('offline', onOff);
    return () => {
      window.removeEventListener('online', onOff);
      window.removeEventListener('offline', onOff);
    };
  }, [load]);

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

  const openEditor = (curriculum: Curriculum, markDirty: boolean) => {
    const hydrated = hydrateCurriculum(curriculum);
    setCurrent(hydrated);
    setSelectedNodeId(hydrated.nodes[0]?.id ?? null);
    setIssues(validateCurriculum(hydrated));
    setDirty(markDirty);
    setPublishAttempted(false);
  };

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
    setSaveError('');
    if (status === 'published') {
      setPublishAttempted(true);
      if (found.length > 0) return;
    }
    try {
      await getPort(classCode, false).saveCurriculum(next);
      localStorage.removeItem(draftKey(classCode, next.id));
      setDirty(false);
      setCurrent(next);
      toast.success(status === 'published' ? tx('paths:currPublishedToast') : tx('paths:currDraftSavedToast'));
      await load();
    } catch (err) {
      console.error(err);
      const message = tx('paths:currSaveFail');
      setSaveError(message);
      toast.error(message);
      // Keep dirty so the teacher does not lose the draft.
    }
  };

  const canAssign = !!current && current.status === 'published' && !dirty && issues.length === 0;

  const assign = async (scope: Assignment['scope'], mode: Assignment['mode']) => {
    if (!current || !canAssign) return;
    try {
      const assignment: Assignment = {
        id: `as-${scope.kind}-${scope.kind === 'student' ? scope.studentKey : 'class'}-${current.id}`,
        curriculumId: current.id,
        scope,
        mode,
        updatedAt: Date.now(),
      };
      await getPort(classCode, false).saveAssignment(classCode, assignment);
      toast.success(tx('paths:currAssignedToast'));
      await load();
    } catch (err) {
      console.error(err);
      toast.error(tx('paths:currAssignFail'));
    }
  };

  const removeCurriculum = async (id: string) => {
    if (!window.confirm(tx('paths:currConfirmDelete'))) return;
    try {
      await getPort(classCode, false).deleteCurriculum(classCode, id);
      if (current?.id === id) {
        setCurrent(null);
        setDirty(false);
      }
      await load();
    } catch (err) {
      console.error(err);
      toast.error(tx('paths:currDeleteFail'));
    }
  };

  const leaveEditor = () => {
    if (dirty && !window.confirm(tx('paths:currUnsaved'))) return;
    setCurrent(null);
    setDirty(false);
    setPublishAttempted(false);
  };

  const goBack = () => {
    if (current) {
      leaveEditor();
      return;
    }
    navigate(`/teacher/${classCode}`);
  };

  const issueText = useMemo(() => issues.map((issue) => tx(`paths:issue_${issue}`)), [issues]);
  const selectedNode = current?.nodes.find((node) => node.id === selectedNodeId) ?? current?.nodes[0] ?? null;
  const selectedIndex = current && selectedNode ? current.nodes.findIndex((node) => node.id === selectedNode.id) : -1;

  return (
    <div
      data-testid="curriculum-workshop"
      className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background"
    >
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-[48px] gap-2"
              onClick={goBack}
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
              {current ? tx('paths:currBackToList') : tx('paths:currBack')}
            </Button>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">{tx('paths:currWorkshop')}</p>
              <h1 className="text-2xl font-semibold sm:text-3xl">{tx('paths:currTitle')}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {offline && (
              <StatusPill tone="muted">
                <WifiOff className="me-1 h-3.5 w-3.5" aria-hidden />
                {tx('paths:currOfflineShort')}
              </StatusPill>
            )}
            {current && dirty && <StatusPill tone="warn">{tx('paths:currUnsavedShort')}</StatusPill>}
            {current && !dirty && <StatusPill tone="ok">{tx('paths:currSavedShort')}</StatusPill>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <p className="mb-4 text-sm text-muted-foreground">{tx('paths:currSoloNote')}</p>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{tx('paths:currError')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!current && (
          <ListView
            list={list}
            assignments={assignments}
            error={error}
            onCreate={() => openEditor(blankCurriculum(classCode), true)}
            onDuplicate={(pathId) => {
              const path = PATHS.find((item) => item.id === pathId);
              if (!path) return;
              openEditor(
                hydrateCurriculum(
                  duplicatePath(path, classCode, `dup-${path.id}-${Date.now()}`, tx(path.titleKey))
                ),
                true
              );
            }}
            onEdit={(item) => openEditor(item, false)}
            onDelete={(id) => void removeCurriculum(id)}
          />
        )}

        {current && selectedNode && selectedIndex >= 0 && (
          <Editor
            curriculum={current}
            selectedNode={selectedNode}
            selectedIndex={selectedIndex}
            issues={issueText}
            showPublishIssues={publishAttempted && issues.length > 0}
            dirty={dirty}
            saveError={saveError}
            students={students}
            studentKey={studentKey}
            canAssign={canAssign}
            onStudentKey={setStudentKey}
            onSelectNode={setSelectedNodeId}
            onChange={update}
            onSaveDraft={() => void save('draft')}
            onPublish={() => void save('published')}
            onAssignClass={(mode) => void assign({ kind: 'class' }, mode)}
            onAssignStudent={(mode) => studentKey && void assign({ kind: 'student', studentKey }, mode)}
            onPreview={(nodeId) => navigate(`/play/c/${current.id}/${nodeId}?preview=1`)}
          />
        )}
      </div>
    </div>
  );
};

const ListView = ({
  list,
  assignments,
  error,
  onCreate,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  list: Curriculum[];
  assignments: Assignment[];
  error: string;
  onCreate: () => void;
  onDuplicate: (pathId: string) => void;
  onEdit: (item: Curriculum) => void;
  onDelete: (id: string) => void;
}) => (
  <div className="space-y-8">
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold">{tx('paths:currStart')}</h2>
        <p className="mt-1 text-muted-foreground">{tx('paths:currStartLead')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCreate}
          className="flex min-h-[140px] flex-col items-start justify-between rounded-2xl border-2 border-primary bg-primary/10 p-5 text-start transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="h-8 w-8 text-primary" aria-hidden />
          <span className="text-xl font-semibold text-foreground">{tx('paths:currCreate')}</span>
        </button>
        <label className="flex min-h-[140px] flex-col justify-center gap-3 rounded-2xl border-2 border-border bg-card p-5 text-start">
          <span className="text-sm font-medium text-muted-foreground">{tx('paths:currDuplicate')}</span>
          <select
            data-testid="duplicate-path"
            className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3 text-start text-base"
            defaultValue=""
            onChange={(event) => {
              const value = event.target.value;
              event.target.value = '';
              if (value) onDuplicate(value);
            }}
          >
            <option value="">{tx('paths:defaultPath')}</option>
            {PATHS.map((path) => (
              <option key={path.id} value={path.id}>
                {tx(path.titleKey)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>

    <section>
      <h2 className="mb-4 text-2xl font-semibold">{tx('paths:currYours')}</h2>
      {list.length === 0 && !error && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
          {tx('paths:currEmpty')}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((item) => {
          const assigned = assignments.filter((entry) => entry.curriculumId === item.id).length;
          const problems = countProblems(item);
          return (
            <article
              key={item.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-xl font-semibold">{item.name.trim() || tx('paths:currUntitled')}</h3>
                <StatusPill tone={item.status === 'published' ? 'ok' : 'muted'}>
                  {item.status === 'published' ? tx('paths:currStatusPublished') : tx('paths:currStatusDraft')}
                </StatusPill>
              </div>
              <p className="text-sm text-muted-foreground">
                {tx('paths:currCounts', { planets: item.nodes.length, problems })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tx('paths:currAssigned')}: {assigned}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button type="button" className="min-h-[48px]" onClick={() => onEdit(item)}>
                  {tx('paths:currEdit')}
                </Button>
                <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => onDelete(item.id)}>
                  {tx('paths:currDelete')}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  </div>
);

const Editor = ({
  curriculum,
  selectedNode,
  selectedIndex,
  issues,
  showPublishIssues,
  dirty,
  saveError,
  students,
  studentKey,
  canAssign,
  onStudentKey,
  onSelectNode,
  onChange,
  onSaveDraft,
  onPublish,
  onAssignClass,
  onAssignStudent,
  onPreview,
}: {
  curriculum: Curriculum;
  selectedNode: CurriculumNode;
  selectedIndex: number;
  issues: string[];
  showPublishIssues: boolean;
  dirty: boolean;
  saveError: string;
  students: string[];
  studentKey: string;
  canAssign: boolean;
  onStudentKey: (value: string) => void;
  onSelectNode: (id: string) => void;
  onChange: (next: Curriculum) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onAssignClass: (mode: Assignment['mode']) => void;
  onAssignStudent: (mode: Assignment['mode']) => void;
  onPreview: (nodeId: string) => void;
}) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [openMore, setOpenMore] = useState<Record<string, boolean>>({});

  const patchNode = (index: number, node: CurriculumNode) => {
    const nodes = curriculum.nodes.map((item, itemIndex) => (itemIndex === index ? node : item));
    onChange({ ...curriculum, nodes });
  };

  const patchProblem = (problemIndex: number, problem: Problem) => {
    const problems = selectedNode.source.problems.map((item, itemIndex) =>
      itemIndex === problemIndex ? problem : item
    );
    patchNode(selectedIndex, { ...selectedNode, source: { kind: 'authored', problems } });
  };

  const addPlanet = () => {
    const node = blankNode(`node-${Date.now()}`);
    const nodes = renumber([...curriculum.nodes, node]);
    onChange({ ...curriculum, nodes });
    onSelectNode(node.id);
  };

  const removePlanet = () => {
    if (curriculum.nodes.length <= 1) return;
    if (!window.confirm(tx('paths:currConfirmRemovePlanet'))) return;
    const remaining = curriculum.nodes.filter((item) => item.id !== selectedNode.id);
    const nodes = renumber(remaining);
    onChange({ ...curriculum, nodes });
    onSelectNode(nodes[Math.max(0, selectedIndex - 1)]?.id ?? nodes[0].id);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="block flex-1 text-sm">
            <span className="mb-1 block">{tx('paths:currName')}</span>
            <input
              className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3 text-start"
              value={curriculum.name}
              placeholder={tx('paths:currNamePlaceholder')}
              onChange={(event) => onChange({ ...curriculum, name: event.target.value })}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-[48px]" onClick={onSaveDraft}>
              {tx('paths:currSaveDraft')}
            </Button>
            <Button type="button" className="min-h-[48px]" data-testid="curriculum-save" onClick={onPublish}>
              {tx('paths:currPublish')}
            </Button>
          </div>
        </div>
        {saveError && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {saveError}
          </p>
        )}
        {showPublishIssues && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{tx('paths:currInvalid')}</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc ps-5">
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.9fr)_1.4fr]">
        <aside className="rounded-2xl border border-border bg-card p-3 sm:p-4">
          <h2 className="mb-3 text-lg font-semibold">{tx('paths:currPlanets')}</h2>
          <ul className="space-y-2">
            {curriculum.nodes.map((node, index) => {
              const bad = nodeHasProblems(node);
              const selected = node.id === selectedNode.id;
              return (
                <li key={node.id}>
                  <div
                    className={cn(
                      'flex items-stretch gap-1 rounded-xl border p-1',
                      selected ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                  >
                    <button
                      type="button"
                      className="min-h-[48px] flex-1 rounded-lg px-2 py-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onSelectNode(node.id)}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{index + 1}.</span>
                        <span className="font-medium">
                          {node.title.trim() || tx('paths:currUntitledPlanet')}
                        </span>
                        {bad ? (
                          <AlertTriangle className="ms-auto h-4 w-4 text-destructive" aria-label={tx('paths:currNeedsWork')} />
                        ) : (
                          <Check className="ms-auto h-4 w-4 text-success" aria-hidden />
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {tx('paths:currProblemTotal', { count: node.source.problems.length })}
                      </span>
                    </button>
                    <div className="flex flex-col">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="min-h-[48px] min-w-[48px]"
                        disabled={index === 0}
                        aria-label={tx('paths:currUp')}
                        onClick={() => onChange(moveNode(curriculum, index, -1))}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="min-h-[48px] min-w-[48px]"
                        disabled={index === curriculum.nodes.length - 1}
                        aria-label={tx('paths:currDown')}
                        onClick={() => onChange(moveNode(curriculum, index, 1))}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Button type="button" variant="outline" className="mt-3 min-h-[48px] w-full gap-2" onClick={addPlanet}>
            <Plus className="h-4 w-4" aria-hidden />
            {tx('paths:currAddPlanet')}
          </Button>
        </aside>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-3 sm:p-5">
          <label className="block text-sm">
            <span className="mb-1 block">{tx('paths:currPlanet')}</span>
            <input
              className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3 text-start"
              value={selectedNode.title}
              onChange={(event) => patchNode(selectedIndex, { ...selectedNode, title: event.target.value })}
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span>{tx('paths:currThreshold')}</span>
              <span className="tabular-nums" dir="ltr">
                {selectedNode.masteryThreshold}%
              </span>
            </div>
            <Slider
              min={50}
              max={100}
              step={5}
              value={[selectedNode.masteryThreshold]}
              onValueChange={([value]) =>
                patchNode(selectedIndex, { ...selectedNode, masteryThreshold: value ?? 80 })
              }
              className="min-h-[48px] py-3"
              aria-label={tx('paths:currThreshold')}
            />
          </div>

          <label className="block text-sm">
            <span className="mb-1 block">{tx('paths:currExtra')}</span>
            <input
              type="number"
              min={0}
              max={10}
              className="min-h-[48px] w-full max-w-[8rem] rounded-xl border border-border bg-background px-3"
              dir="ltr"
              value={selectedNode.extraPractice ?? 0}
              onChange={(event) =>
                patchNode(selectedIndex, {
                  ...selectedNode,
                  extraPractice: Math.max(0, Math.min(10, Number(event.target.value) || 0)),
                })
              }
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[48px] gap-2"
              disabled={dirty}
              title={dirty ? tx('paths:currPreviewNeedsSave') : undefined}
              onClick={() => onPreview(selectedNode.id)}
            >
              <Eye className="h-4 w-4" aria-hidden />
              {tx('paths:currPreview')}
            </Button>
            {dirty && <p className="w-full text-sm text-muted-foreground">{tx('paths:currPreviewNeedsSave')}</p>}
            <Button
              type="button"
              variant="outline"
              className="min-h-[48px] gap-2"
              disabled={!canSplitNode(selectedNode)}
              title={
                canSplitNode(selectedNode) ? undefined : tx('paths:currSplitNeedsProblems')
              }
              onClick={() => onChange(splitNode(curriculum, selectedNode.id))}
            >
              <Split className="h-4 w-4" aria-hidden />
              {tx('paths:currSplit')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[48px] gap-2"
              disabled={curriculum.nodes.length <= 1}
              onClick={removePlanet}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {tx('paths:currRemove')}
            </Button>
          </div>

          {selectedNode.source.problems.map((problem, problemIndex) => {
            const fieldIssues = problemFieldIssues(problem);
            const touch = (field: string) => setTouched((prev) => ({ ...prev, [`${problem.id}:${field}`]: true }));
            const show = (field: ProblemFieldIssue) =>
              fieldIssues.includes(field) &&
              (field === 'hint' || field === 'example' || touched[`${problem.id}:${field}`] || showPublishIssues);
            const moreOpen = openMore[problem.id] ?? false;
            const moreWarn = fieldIssues.includes('hint') || fieldIssues.includes('example');
            return (
              <article key={problem.id} className="rounded-xl border border-border p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-medium">{tx('paths:currProblemN', { n: problemIndex + 1 })}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-[48px] gap-2"
                    disabled={selectedNode.source.problems.length <= 1}
                    aria-label={tx('paths:currDeleteProblem')}
                    onClick={() => {
                      const problems = selectedNode.source.problems.filter((_, index) => index !== problemIndex);
                      patchNode(selectedIndex, { ...selectedNode, source: { kind: 'authored', problems } });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    {tx('paths:currDeleteProblem')}
                  </Button>
                </div>

                <label className="mb-3 block text-sm">
                  <span className="mb-1 block">{tx('paths:currPrompt')}</span>
                  <textarea
                    className="min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2 text-start"
                    value={problem.prompt ?? ''}
                    onBlur={() => touch('prompt')}
                    onChange={(event) => patchProblem(problemIndex, { ...problem, prompt: event.target.value })}
                  />
                  {show('prompt') && (
                    <span className="mt-1 block text-sm text-destructive">{tx('paths:currPromptRequired')}</span>
                  )}
                </label>

                <label className="mb-3 block text-sm">
                  <span className="mb-1 block">{tx('paths:currAnswer')}</span>
                  <input
                    className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3"
                    dir="ltr"
                    inputMode="numeric"
                    value={problem.answer}
                    onBlur={() => touch('answer')}
                    onChange={(event) => patchProblem(problemIndex, { ...problem, answer: event.target.value })}
                  />
                  {show('answer') && (
                    <span className="mt-1 block text-sm text-destructive">{tx('paths:currWholeNumber')}</span>
                  )}
                </label>

                <label className="mb-3 block text-sm">
                  <span className="mb-1 block">{tx('paths:currDifficulty')}</span>
                  <select
                    className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3"
                    value={problem.difficulty}
                    onChange={(event) =>
                      patchProblem(problemIndex, {
                        ...problem,
                        difficulty: Number(event.target.value) as Problem['difficulty'],
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border border-border px-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setOpenMore((prev) => ({ ...prev, [problem.id]: !moreOpen }))}
                  aria-expanded={moreOpen}
                >
                  <span className="flex items-center gap-2">
                    {tx('paths:currMore')}
                    {moreWarn && <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />}
                  </span>
                  {moreOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {moreOpen && (
                  <div className="mt-3 space-y-3">
                    <label className="block text-sm">
                      <span className="mb-1 block">{tx('paths:currHints')}</span>
                      <textarea
                        className="min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2 text-start"
                        value={(problem.hints ?? ['', '', '']).slice(0, 3).join('\n')}
                        onChange={(event) => {
                          const lines = event.target.value.split('\n');
                          const hints = [lines[0] ?? '', lines[1] ?? '', lines[2] ?? ''];
                          patchProblem(problemIndex, { ...problem, hints });
                        }}
                      />
                      {show('hint') && (
                        <span className="mt-1 block text-sm text-destructive">{tx('paths:issue_hint')}</span>
                      )}
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block">{tx('paths:currExample')}</span>
                      <textarea
                        className="min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2 text-start"
                        value={problem.workedExample?.prompt ?? ''}
                        onChange={(event) => {
                          const text = event.target.value;
                          const steps = problem.workedExample?.steps ?? [];
                          if (!text.trim() && steps.length === 0) {
                            const next = { ...problem };
                            delete next.workedExample;
                            patchProblem(problemIndex, next);
                            return;
                          }
                          const workedExample: NonNullable<Problem['workedExample']> = {
                            prompt: text,
                            steps,
                          };
                          if (problem.workedExample?.promptValues) {
                            workedExample.promptValues = problem.workedExample.promptValues;
                          }
                          if (problem.workedExample?.promptKey) {
                            workedExample.promptKey = problem.workedExample.promptKey;
                          }
                          patchProblem(problemIndex, { ...problem, workedExample });
                        }}
                      />
                      {show('example') && (
                        <span className="mt-1 block text-sm text-destructive">{tx('paths:issue_example')}</span>
                      )}
                    </label>
                  </div>
                )}
              </article>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="min-h-[48px] w-full gap-2"
            disabled={selectedNode.source.problems.length >= MAX_PROBLEMS}
            onClick={() =>
              patchNode(selectedIndex, {
                ...selectedNode,
                source: {
                  kind: 'authored',
                  problems: [
                    ...selectedNode.source.problems,
                    blankProblem(`${selectedNode.id}-p${selectedNode.source.problems.length + 1}`),
                  ],
                },
              })
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            {tx('paths:currAddProblem')}
            {selectedNode.source.problems.length < MIN_PROBLEMS && (
              <span className="text-xs text-muted-foreground">
                ({selectedNode.source.problems.length}/{MIN_PROBLEMS})
              </span>
            )}
          </Button>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">{tx('paths:currAssignTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{tx('paths:currAssignLead')}</p>
        {!canAssign && (
          <p className="mt-2 text-sm text-muted-foreground">{tx('paths:currAssignNeedsPublish')}</p>
        )}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border p-3">
            <h3 className="mb-3 font-medium">{tx('paths:currAssignClass')}</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                data-testid="assign-class"
                variant="outline"
                className="min-h-[48px]"
                disabled={!canAssign}
                onClick={() => onAssignClass('alongside')}
              >
                {tx('paths:currAlongside')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px]"
                disabled={!canAssign}
                onClick={() => onAssignClass('replace')}
              >
                {tx('paths:currReplace')}
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <h3 className="mb-3 font-medium">{tx('paths:currAssignStudent')}</h3>
            <label className="mb-3 block text-sm">
              <select
                className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3 text-start"
                value={studentKey}
                disabled={!canAssign}
                onChange={(event) => onStudentKey(event.target.value)}
              >
                <option value="">{tx('paths:noneYet')}</option>
                {students.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px]"
                disabled={!canAssign || !studentKey}
                onClick={() => onAssignStudent('alongside')}
              >
                {tx('paths:currAlongside')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px]"
                disabled={!canAssign || !studentKey}
                onClick={() => onAssignStudent('replace')}
              >
                {tx('paths:currReplace')}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CurriculumPage;
