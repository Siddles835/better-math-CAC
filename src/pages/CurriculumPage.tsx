import { tx } from '@/i18n/tx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Eye,
  GripVertical,
  Loader2,
  Lock,
  MoreHorizontal,
  Orbit,
  Plus,
  Split,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { PATHS } from '@/content/catalog';
import type { Assignment, Curriculum, CurriculumNode, Problem } from '@/content/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const relativeWhen = (timestamp: number): string => {
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60) return rtf.format(seconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
  return rtf.format(Math.round(seconds / 86_400), 'day');
};

const StatusChip = ({
  tone,
  children,
}: {
  tone: 'muted' | 'warn' | 'ok' | 'busy';
  children: React.ReactNode;
}) => (
  <span
    className={cn(
      'inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 text-sm',
      tone === 'muted' && 'border-border text-muted-foreground',
      tone === 'warn' && 'border-amber-500/40 text-amber-700 dark:text-amber-300',
      tone === 'ok' && 'border-border text-success',
      tone === 'busy' && 'border-border text-muted-foreground'
    )}
  >
    {children}
  </span>
);

const workshopShellClass =
  'curriculum-workshop-shell min-h-screen bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_55%),radial-gradient(circle,hsl(var(--foreground)/0.08)_1px,transparent_1px)] bg-[length:auto,22px_22px] bg-background';

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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentKey, setStudentKey] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [publishAttempted, setPublishAttempted] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
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
    } finally {
      setLoading(false);
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
    setSaveError('');
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
    setSaving(true);
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
    } finally {
      setSaving(false);
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

  const statusChip = (() => {
    if (offline) {
      return (
        <StatusChip tone="muted">
          <WifiOff className="h-3.5 w-3.5" aria-hidden />
          {tx('paths:currOfflineShort')}
        </StatusChip>
      );
    }
    if (saving) {
      return (
        <StatusChip tone="busy">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {tx('paths:currSaving')}
        </StatusChip>
      );
    }
    if (current && dirty) {
      return (
        <StatusChip tone="warn">
          <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
          {tx('paths:currUnsavedDot')}
        </StatusChip>
      );
    }
    if (current) {
      return (
        <StatusChip tone="ok">
          <Check className="h-3.5 w-3.5" aria-hidden />
          {tx('paths:currSavedShort')}
        </StatusChip>
      );
    }
    return null;
  })();

  const saveButtons = (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-[48px]"
        disabled={!current || saving}
        onClick={() => void save('draft')}
      >
        {tx('paths:currSaveDraft')}
      </Button>
      <Button
        type="button"
        className="min-h-[48px]"
        data-testid="curriculum-save"
        disabled={!current || saving}
        onClick={() => void save('published')}
      >
        {tx('paths:currPublish')}
      </Button>
    </>
  );

  return (
    <div data-testid="curriculum-workshop" className={workshopShellClass}>
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button type="button" variant="outline" className="min-h-[48px] gap-2 shrink-0" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
              {current ? tx('paths:currBackToList') : tx('paths:currBack')}
            </Button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {tx('paths:currWorkshop')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusChip}
            {current && <div className="hidden md:flex flex-wrap gap-2">{saveButtons}</div>}
          </div>
        </div>
        {saveError && current && (
          <p className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive sm:px-6" role="alert">
            {saveError}
          </p>
        )}
      </header>

      <div className={cn('mx-auto max-w-6xl px-4 py-6 sm:px-6', current && 'pb-28 md:pb-6')}>
        {error && !current && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{tx('paths:currError')}</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>{error}</span>
              <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => void load()}>
                {tx('paths:currRetry')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!current && (
          <ListView
            list={list}
            assignments={assignments}
            loading={loading}
            error={error}
            onRetry={() => void load()}
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
            issueCodes={issues}
            issueText={issueText}
            showPublishIssues={publishAttempted && issues.length > 0}
            dirty={dirty}
            students={students}
            studentKey={studentKey}
            canAssign={canAssign}
            onStudentKey={setStudentKey}
            onSelectNode={setSelectedNodeId}
            onChange={update}
            onAssignClass={(mode) => void assign({ kind: 'class' }, mode)}
            onAssignStudent={(mode) => studentKey && void assign({ kind: 'student', studentKey }, mode)}
            onPreview={(nodeId) => navigate(`/play/c/${current.id}/${nodeId}?preview=1`)}
          />
        )}
      </div>

      {current && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 p-3 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-6xl gap-2">{saveButtons}</div>
        </div>
      )}
    </div>
  );
};

const ListView = ({
  list,
  assignments,
  loading,
  error,
  onRetry,
  onCreate,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  list: Curriculum[];
  assignments: Assignment[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onCreate: () => void;
  onDuplicate: (pathId: string) => void;
  onEdit: (item: Curriculum) => void;
  onDelete: (id: string) => void;
}) => {
  const assignedLabel = (curriculumId: string) => {
    const mine = assignments.filter((entry) => entry.curriculumId === curriculumId);
    if (mine.some((entry) => entry.scope.kind === 'class')) return tx('paths:currAssignedWhole');
    const students = mine.filter((entry) => entry.scope.kind === 'student').length;
    if (students > 0) return tx('paths:currAssignedStudents', { count: students });
    return tx('paths:currAssignedNone');
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-[28px] font-semibold leading-tight sm:text-[30px]">{tx('paths:currStart')}</h2>
          <p className="mt-1 text-[15px] text-muted-foreground sm:text-base">{tx('paths:currStartLead')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCreate}
            className="flex min-h-[148px] flex-col items-start justify-between rounded-2xl border-2 border-primary/40 bg-primary/10 p-5 text-start shadow-sm transition duration-150 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <Plus className="h-8 w-8 text-primary" aria-hidden />
            <span className="text-xl font-semibold text-foreground">{tx('paths:currCreate')}</span>
          </button>
          <label className="flex min-h-[148px] flex-col justify-between gap-3 rounded-2xl border-2 border-border bg-card p-5 text-start shadow-sm">
            <span>
              <span className="block text-xl font-semibold text-foreground">{tx('paths:currDuplicateCard')}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{tx('paths:currDuplicateLead')}</span>
            </span>
            <select
              data-testid="duplicate-path"
              className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3 text-start text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <h2 className="mb-4 text-lg font-semibold sm:text-xl">{tx('paths:currYours')}</h2>
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-40 animate-pulse rounded-2xl border border-border bg-muted/40" />
            ))}
          </div>
        )}
        {!loading && list.length === 0 && !error && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-card/60 px-6 py-12 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center text-primary">
              <Orbit className="h-16 w-16 opacity-40" aria-hidden />
              <Plus className="absolute h-6 w-6" aria-hidden />
            </div>
            <p className="max-w-md text-[15px] text-muted-foreground">{tx('paths:currEmptyLead')}</p>
            <Button type="button" className="min-h-[48px] gap-2" onClick={onCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              {tx('paths:currCreate')}
            </Button>
          </div>
        )}
        {!loading && error && list.length === 0 && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-sm text-destructive">{tx('paths:currError')}</p>
            <Button type="button" variant="outline" className="mt-4 min-h-[48px]" onClick={onRetry}>
              {tx('paths:currRetry')}
            </Button>
          </div>
        )}
        {!loading && list.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((item) => {
              const problems = countProblems(item);
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm transition duration-150 hover:ring-1 hover:ring-ring/40 sm:p-5 motion-reduce:transition-none"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <h3
                      className={cn(
                        'text-lg font-semibold sm:text-xl',
                        !item.name.trim() && 'text-muted-foreground'
                      )}
                    >
                      {item.name.trim() || tx('paths:currUntitled')}
                    </h3>
                    <StatusChip tone={item.status === 'published' ? 'ok' : 'muted'}>
                      {item.status === 'published'
                        ? tx('paths:currStatusPublished')
                        : tx('paths:currStatusDraft')}
                    </StatusChip>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tx('paths:currCounts', { planets: item.nodes.length, problems })}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tx('paths:currAssignedTo', { who: assignedLabel(item.id) })}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tx('paths:currEdited', { when: relativeWhen(item.updatedAt) })}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button type="button" className="min-h-[48px]" onClick={() => onEdit(item)}>
                      {tx('paths:currEdit')}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="outline" className="min-h-[48px]">
                          {tx('paths:currDelete')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{tx('paths:currDelete')}</AlertDialogTitle>
                          <AlertDialogDescription>{tx('paths:currConfirmDelete')}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="min-h-[48px]">{tx('paths:currBack')}</AlertDialogCancel>
                          <AlertDialogAction className="min-h-[48px]" onClick={() => onDelete(item.id)}>
                            {tx('paths:currDelete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

const Editor = ({
  curriculum,
  selectedNode,
  selectedIndex,
  issueCodes,
  issueText,
  showPublishIssues,
  dirty,
  students,
  studentKey,
  canAssign,
  onStudentKey,
  onSelectNode,
  onChange,
  onAssignClass,
  onAssignStudent,
  onPreview,
}: {
  curriculum: Curriculum;
  selectedNode: CurriculumNode;
  selectedIndex: number;
  issueCodes: CurriculumIssue[];
  issueText: string[];
  showPublishIssues: boolean;
  dirty: boolean;
  students: string[];
  studentKey: string;
  canAssign: boolean;
  onStudentKey: (value: string) => void;
  onSelectNode: (id: string) => void;
  onChange: (next: Curriculum) => void;
  onAssignClass: (mode: Assignment['mode']) => void;
  onAssignStudent: (mode: Assignment['mode']) => void;
  onPreview: (nodeId: string) => void;
}) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [openProblems, setOpenProblems] = useState<string[]>([]);
  const titleRef = useRef<HTMLInputElement>(null);
  const planetRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const problemRefs = useRef<Record<string, HTMLElement | null>>({});

  const step = canAssign ? 3 : curriculum.status === 'published' && !dirty ? 2 : 1;

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

  const focusIssue = (issue: CurriculumIssue) => {
    if (issue === 'name') {
      titleRef.current?.focus();
      titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    for (const node of curriculum.nodes) {
      if (issue === 'threshold' && (node.masteryThreshold < 50 || node.masteryThreshold > 100)) {
        onSelectNode(node.id);
        planetRefs.current[node.id]?.focus();
        return;
      }
      if (issue === 'problems' && (node.source.problems.length < MIN_PROBLEMS || node.source.problems.length > MAX_PROBLEMS)) {
        onSelectNode(node.id);
        planetRefs.current[node.id]?.focus();
        return;
      }
      for (const problem of node.source.problems) {
        const fields = problemFieldIssues(problem);
        const map: Partial<Record<CurriculumIssue, ProblemFieldIssue>> = {
          prompt: 'prompt',
          answer: 'answer',
          hint: 'hint',
          example: 'example',
        };
        const field = map[issue];
        if (field && fields.includes(field)) {
          onSelectNode(node.id);
          setOpenProblems((prev) => (prev.includes(problem.id) ? prev : [...prev, problem.id]));
          window.setTimeout(() => {
            problemRefs.current[problem.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
          return;
        }
        if (issue === 'duplicate-prompt') {
          onSelectNode(node.id);
          setOpenProblems((prev) => (prev.includes(problem.id) ? prev : [...prev, problem.id]));
          return;
        }
      }
    }
  };

  const steps = [
    { id: 1, label: tx('paths:currStepBuild') },
    { id: 2, label: tx('paths:currStepPublish') },
    { id: 3, label: tx('paths:currStepAssign'), locked: !canAssign },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <input
            ref={titleRef}
            className="w-full border-0 border-b border-transparent bg-transparent text-[28px] font-semibold leading-tight text-foreground outline-none transition duration-150 placeholder:text-muted-foreground hover:border-border focus:border-primary focus-visible:ring-0 sm:text-[30px] motion-reduce:transition-none"
            value={curriculum.name}
            placeholder={tx('paths:currNamePlaceholder')}
            aria-label={tx('paths:currName')}
            onChange={(event) => onChange({ ...curriculum, name: event.target.value })}
          />
          <p className="mt-2 text-[13px] text-muted-foreground sm:text-sm">{tx('paths:currNameHelp')}</p>
        </div>

        <ol className="flex flex-wrap gap-2" aria-label={tx('paths:currWorkshop')}>
          {steps.map((item) => (
            <li
              key={item.id}
              className={cn(
                'inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 text-sm transition duration-150 motion-reduce:transition-none',
                step === item.id
                  ? 'border-primary bg-primary/15 text-foreground'
                  : 'border-border text-muted-foreground',
                'locked' in item && item.locked && 'opacity-70'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  step === item.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                {'locked' in item && item.locked ? <Lock className="h-3 w-3" aria-hidden /> : item.id}
              </span>
              {item.label}
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold">{tx('paths:currReadyTitle')}</h2>
          {issueCodes.length === 0 ? (
            <p className="mt-2 text-sm text-success">{tx('paths:currReadyOk')}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">{tx('paths:currReadyFix')}</p>
              <ul className="mt-2 space-y-1">
                {issueCodes.map((issue, index) => (
                  <li key={issue}>
                    <button
                      type="button"
                      className="min-h-[40px] text-start text-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => focusIssue(issue)}
                    >
                      {issueText[index]}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {showPublishIssues && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{tx('paths:currInvalid')}</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc ps-5">
                {issueText.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(240px,0.9fr)_1.4fr]">
        <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-lg font-semibold">{tx('paths:currPlanets')}</h2>
          <ul className="relative flex gap-3 overflow-x-auto pb-2 lg:block lg:space-y-0 lg:overflow-visible lg:pb-0">
            <span
              className="pointer-events-none absolute start-[1.35rem] top-4 bottom-16 hidden w-px bg-border lg:block"
              aria-hidden
            />
            {curriculum.nodes.map((node, index) => {
              const bad = nodeHasProblems(node);
              const selected = node.id === selectedNode.id;
              return (
                <li key={node.id} className="relative min-w-[220px] shrink-0 lg:min-w-0 lg:ps-0">
                  <div
                    className={cn(
                      'flex items-stretch gap-1 rounded-2xl border p-1 transition duration-150 motion-reduce:transition-none',
                      selected
                        ? 'border-primary bg-primary/10 shadow-sm lg:border-s-4 lg:border-s-primary'
                        : 'border-border bg-background/40'
                    )}
                  >
                    <button
                      type="button"
                      ref={(el) => {
                        planetRefs.current[node.id] = el;
                      }}
                      className="min-h-[56px] flex-1 rounded-xl px-2 py-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onSelectNode(node.id)}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card'
                          )}
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {node.title.trim() || tx('paths:currUntitledPlanet')}
                        </span>
                        {bad ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-label={tx('paths:currNeedsWork')} />
                        ) : (
                          <Check className="h-4 w-4 text-success" aria-hidden />
                        )}
                      </span>
                      <span className="mt-1 block ps-10 text-xs text-muted-foreground">
                        {tx('paths:currProblemTotal', { count: node.source.problems.length })}
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="min-h-[48px] min-w-[48px]"
                          aria-label={tx('paths:currMoreActions')}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <GripVertical className="sr-only" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={index === 0}
                          onClick={() => onChange(moveNode(curriculum, index, -1))}
                        >
                          {tx('paths:currUp')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={index === curriculum.nodes.length - 1}
                          onClick={() => onChange(moveNode(curriculum, index, 1))}
                        >
                          {tx('paths:currDown')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
          <Button
            type="button"
            variant="outline"
            className="mt-4 min-h-[48px] w-full gap-2 border-dashed"
            onClick={addPlanet}
          >
            <Plus className="h-4 w-4" aria-hidden />
            {tx('paths:currAddPlanet')}
          </Button>
        </aside>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">{tx('paths:currPlanetDetails')}</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="min-h-[48px] gap-2">
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                    {tx('paths:currMoreActions')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={dirty}
                    title={dirty ? tx('paths:currPreviewNeedsSave') : undefined}
                    onClick={() => !dirty && onPreview(selectedNode.id)}
                  >
                    <Eye className="me-2 h-4 w-4" />
                    {tx('paths:currPreview')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canSplitNode(selectedNode)}
                    title={canSplitNode(selectedNode) ? undefined : tx('paths:currSplitNeedsProblems')}
                    onClick={() => canSplitNode(selectedNode) && onChange(splitNode(curriculum, selectedNode.id))}
                  >
                    <Split className="me-2 h-4 w-4" />
                    {tx('paths:currSplit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={curriculum.nodes.length <= 1}
                    onClick={removePlanet}
                  >
                    <Trash2 className="me-2 h-4 w-4" />
                    {tx('paths:currRemove')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {dirty && (
              <p className="mb-3 text-sm text-muted-foreground">{tx('paths:currPreviewNeedsSave')}</p>
            )}

            <label className="mb-4 block text-sm">
              <span className="mb-1 block font-medium">{tx('paths:currPlanet')}</span>
              <input
                className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedNode.title}
                onChange={(event) => patchNode(selectedIndex, { ...selectedNode, title: event.target.value })}
              />
            </label>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{tx('paths:currThreshold')}</span>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-sm tabular-nums" dir="ltr">
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
              <p className="mt-1 text-[13px] text-muted-foreground">{tx('paths:currThresholdHelp')}</p>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium">{tx('paths:currExtra')}</span>
              <div className="inline-flex items-center gap-1 rounded-xl border border-border p-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-[48px] min-w-[48px]"
                  aria-label="-"
                  onClick={() =>
                    patchNode(selectedIndex, {
                      ...selectedNode,
                      extraPractice: Math.max(0, (selectedNode.extraPractice ?? 0) - 1),
                    })
                  }
                >
                  −
                </Button>
                <span className="min-w-[2.5rem] text-center tabular-nums" dir="ltr">
                  {selectedNode.extraPractice ?? 0}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-[48px] min-w-[48px]"
                  aria-label="+"
                  onClick={() =>
                    patchNode(selectedIndex, {
                      ...selectedNode,
                      extraPractice: Math.min(10, (selectedNode.extraPractice ?? 0) + 1),
                    })
                  }
                >
                  +
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-semibold">{tx('paths:currProblems')}</h2>
              <p className="text-sm text-muted-foreground">
                {tx('paths:currProblemRange', { count: selectedNode.source.problems.length })}
              </p>
            </div>

            <Accordion
              type="multiple"
              value={openProblems}
              onValueChange={setOpenProblems}
              className="space-y-3"
            >
              {selectedNode.source.problems.map((problem, problemIndex) => {
                const fieldIssues = problemFieldIssues(problem);
                const touch = (field: string) =>
                  setTouched((prev) => ({ ...prev, [`${problem.id}:${field}`]: true }));
                const show = (field: ProblemFieldIssue) =>
                  fieldIssues.includes(field) &&
                  (field === 'hint' ||
                    field === 'example' ||
                    touched[`${problem.id}:${field}`] ||
                    showPublishIssues);
                const hints = [...(problem.hints ?? ['', '', '']), '', '', ''].slice(0, 3);
                const preview =
                  (problem.prompt ?? '').trim() ||
                  tx('paths:currUntitledPlanet');
                return (
                  <AccordionItem
                    key={problem.id}
                    value={problem.id}
                    className="overflow-hidden rounded-2xl border border-border px-0"
                    ref={(el) => {
                      problemRefs.current[problem.id] = el;
                    }}
                  >
                    <div className="flex items-center gap-1 pe-2">
                      <AccordionTrigger className="min-h-[56px] flex-1 px-4 hover:no-underline">
                        <span className="flex w-full min-w-0 items-center gap-3 text-start">
                          <span className="text-sm text-muted-foreground">{problemIndex + 1}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{preview}</span>
                          {problem.answer.trim() && (
                            <span className="hidden rounded-full border border-border px-2 py-0.5 text-xs tabular-nums sm:inline" dir="ltr">
                              {problem.answer}
                            </span>
                          )}
                          {fieldIssues.length > 0 ? (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                          ) : (
                            <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
                          )}
                        </span>
                      </AccordionTrigger>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="min-h-[48px] min-w-[48px]"
                        aria-label={tx('paths:currDuplicateProblem')}
                        disabled={selectedNode.source.problems.length >= MAX_PROBLEMS}
                        onClick={() => {
                          const copy: Problem = {
                            ...problem,
                            id: `${problem.id}-copy-${Date.now()}`,
                            hints: [...(problem.hints ?? ['', '', ''])],
                          };
                          if (problem.workedExample) {
                            copy.workedExample = { ...problem.workedExample };
                          }
                          const problems = [
                            ...selectedNode.source.problems.slice(0, problemIndex + 1),
                            copy,
                            ...selectedNode.source.problems.slice(problemIndex + 1),
                          ];
                          patchNode(selectedIndex, {
                            ...selectedNode,
                            source: { kind: 'authored', problems },
                          });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="min-h-[48px] min-w-[48px]"
                        disabled={selectedNode.source.problems.length <= 1}
                        aria-label={tx('paths:currDeleteProblem')}
                        onClick={() => {
                          const problems = selectedNode.source.problems.filter(
                            (_, index) => index !== problemIndex
                          );
                          patchNode(selectedIndex, {
                            ...selectedNode,
                            source: { kind: 'authored', problems },
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <AccordionContent className="space-y-4 px-4 pb-4">
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium">{tx('paths:currPrompt')}</span>
                        <textarea
                          className="min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={problem.prompt ?? ''}
                          onBlur={() => touch('prompt')}
                          onChange={(event) =>
                            patchProblem(problemIndex, { ...problem, prompt: event.target.value })
                          }
                        />
                        {show('prompt') && (
                          <span className="mt-1 block text-sm text-destructive">
                            {tx('paths:currPromptRequired')}
                          </span>
                        )}
                      </label>

                      <label className="block text-sm">
                        <span className="mb-1 block font-medium">{tx('paths:currAnswer')}</span>
                        <input
                          className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          dir="ltr"
                          inputMode="numeric"
                          value={problem.answer}
                          onBlur={() => touch('answer')}
                          onChange={(event) =>
                            patchProblem(problemIndex, { ...problem, answer: event.target.value })
                          }
                        />
                        {show('answer') && (
                          <span className="mt-1 block text-sm text-destructive">
                            {tx('paths:currWholeNumber')}
                          </span>
                        )}
                      </label>

                      <fieldset>
                        <legend className="mb-2 text-sm font-medium">{tx('paths:currDifficulty')}</legend>
                        <div className="flex flex-wrap gap-1 rounded-xl border border-border p-1" role="radiogroup">
                          {([1, 2, 3, 4, 5] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              role="radio"
                              aria-checked={problem.difficulty === level}
                              className={cn(
                                'min-h-[48px] min-w-[48px] flex-1 rounded-lg text-sm font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                                problem.difficulty === level
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted'
                              )}
                              onClick={() =>
                                patchProblem(problemIndex, { ...problem, difficulty: level })
                              }
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3">
                        <h3 className="text-sm font-semibold">{tx('paths:currExtras')}</h3>
                        {([0, 1, 2] as const).map((hintIndex) => (
                          <label key={hintIndex} className="block text-sm">
                            <span className="mb-1 block">
                              {tx(`paths:currHint${hintIndex + 1}` as 'paths:currHint1')}
                            </span>
                            <input
                              className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={hints[hintIndex]}
                              onChange={(event) => {
                                const next = [...hints] as [string, string, string];
                                next[hintIndex] = event.target.value;
                                patchProblem(problemIndex, { ...problem, hints: next });
                              }}
                            />
                          </label>
                        ))}
                        {show('hint') && (
                          <span className="block text-sm text-destructive">{tx('paths:issue_hint')}</span>
                        )}
                        <label className="block text-sm">
                          <span className="mb-1 block">{tx('paths:currExample')}</span>
                          <textarea
                            className="min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={problem.workedExample?.prompt ?? ''}
                            onChange={(event) => {
                              const text = event.target.value;
                              const stepsText = problem.workedExample?.steps ?? [];
                              if (!text.trim() && stepsText.length === 0) {
                                const next = { ...problem };
                                delete next.workedExample;
                                patchProblem(problemIndex, next);
                                return;
                              }
                              const workedExample: NonNullable<Problem['workedExample']> = {
                                prompt: text,
                                steps: stepsText,
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
                            <span className="mt-1 block text-sm text-destructive">
                              {tx('paths:issue_example')}
                            </span>
                          )}
                        </label>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            <Button
              type="button"
              variant="outline"
              className="mt-4 min-h-[48px] w-full gap-2"
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
            </Button>
          </section>
        </div>
      </div>

      <section
        className={cn(
          'rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5',
          !canAssign && 'opacity-90'
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold">{tx('paths:currAssignTitle')}</h2>
          {!canAssign && <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />}
        </div>
        {!canAssign ? (
          <p className="text-sm text-muted-foreground">{tx('paths:currAssignPublishFirst')}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{tx('paths:currAssignLead')}</p>
        )}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <h3 className="mb-3 font-medium">{tx('paths:currAssignClass')}</h3>
            <div className="space-y-3">
              <div>
                <Button
                  type="button"
                  data-testid="assign-class"
                  variant="outline"
                  className="min-h-[48px] w-full"
                  disabled={!canAssign}
                  onClick={() => onAssignClass('alongside')}
                >
                  {tx('paths:currAlongside')}
                </Button>
                <p className="mt-1 text-[13px] text-muted-foreground">{tx('paths:currAlongsideHelp')}</p>
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[48px] w-full"
                  disabled={!canAssign}
                  onClick={() => onAssignClass('replace')}
                >
                  {tx('paths:currReplace')}
                </Button>
                <p className="mt-1 text-[13px] text-muted-foreground">{tx('paths:currReplaceHelp')}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <h3 className="mb-3 font-medium">{tx('paths:currAssignStudent')}</h3>
            <label className="mb-3 block text-sm">
              <select
                className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <div className="space-y-3">
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[48px] w-full"
                  disabled={!canAssign || !studentKey}
                  onClick={() => onAssignStudent('alongside')}
                >
                  {tx('paths:currAlongside')}
                </Button>
                <p className="mt-1 text-[13px] text-muted-foreground">{tx('paths:currAlongsideHelp')}</p>
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[48px] w-full"
                  disabled={!canAssign || !studentKey}
                  onClick={() => onAssignStudent('replace')}
                >
                  {tx('paths:currReplace')}
                </Button>
                <p className="mt-1 text-[13px] text-muted-foreground">{tx('paths:currReplaceHelp')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CurriculumPage;
