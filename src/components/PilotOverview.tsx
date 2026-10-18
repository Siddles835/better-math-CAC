import { tx } from '@/i18n/tx';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Classroom } from '@/lib/classroom';
import type { PilotGoals } from '@/content/types';
import { getPort } from '@/lib/data/port';
import { resolveAssignment } from '@/lib/curriculum/logic';
import { learnerFromLegacy } from '@/lib/paths/progress';
import {
  classAverages,
  formatPercent,
  progressRatio,
  reportsToCsv,
  studentReport,
} from '@/lib/reporting/overview';
import { csvFilename } from '@/lib/reporting/csv';
import { formatCsvNumber } from '@/lib/reporting/csv';
import { isDemoMode } from '@/lib/demo/mode';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

type LoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'partial' | 'failed';

const Metric = ({
  label,
  value,
  unavailable,
}: {
  label: string;
  value: string | number;
  unavailable?: boolean;
}) => (
  <div className="rounded-xl border border-border bg-background/50 p-4">
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground" dir="ltr">
      {unavailable ? tx('paths:pilotNotAvailable') : value}
    </dd>
  </div>
);

const formatMinutes = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  return tx('paths:pilotMinutesValue', { minutes: formatCsvNumber(minutes) });
};

const PilotOverview = ({ classCode, classroom }: { classCode: string; classroom: Classroom | null }) => {
  const [goals, setGoals] = useState<PilotGoals>({ whereWeAre: '', whereWeWant: '', updatedAt: 0 });
  const [rows, setRows] = useState<ReturnType<typeof studentReport>[]>([]);
  const [progress, setProgress] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [learnersFailed, setLearnersFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!classroom) return;
    setLoadState('loading');
    setError('');
    setMessage('');
    try {
      const port = getPort(classCode, false);
      const settled = await Promise.allSettled([
        port.listLearners(classCode),
        port.listAssignments(classCode),
        port.listCurricula(classCode),
        port.getGoals(classCode),
      ]);
      const learnersResult = settled[0];
      const learnersOk = learnersResult.status === 'fulfilled';
      const learners = learnersResult.status === 'fulfilled' ? learnersResult.value : {};
      const assignments = settled[1].status === 'fulfilled' ? settled[1].value : [];
      const curricula = settled[2].status === 'fulfilled' ? settled[2].value : [];
      const storedGoals = settled[3].status === 'fulfilled' ? settled[3].value : null;
      const anyFailed = settled.some((result) => result.status === 'rejected');
      const roster = Object.entries(classroom.students ?? {});

      if (storedGoals) setGoals(storedGoals);

      const reports = roster.map(([key, student]) => {
        const hasLearner = learnersOk && Boolean(learners[key]);
        const record = hasLearner ? learners[key]! : learnerFromLegacy(student);
        const assignment = resolveAssignment(assignments, key, false);
        const curriculum = curricula.find((item) => item.id === assignment?.curriculumId);
        return studentReport(
          student.nickname || key,
          record,
          curriculum?.name ?? null,
          student.lastDiagnosis?.primary ?? null,
          !hasLearner
        );
      });
      setRows(reports);
      setProgress(
        roster.map(([key, student]) => {
          const hasLearner = learnersOk && Boolean(learners[key]);
          return progressRatio(hasLearner ? learners[key]! : learnerFromLegacy(student));
        })
      );
      setLearnersFailed(!learnersOk);

      if (anyFailed && reports.length === 0) {
        setLoadState('failed');
        setError(tx('paths:pilotLoadFail'));
      } else if (anyFailed) {
        setLoadState('partial');
        setError(tx('paths:pilotLoadPartial'));
      } else if (reports.length === 0) {
        setLoadState('empty');
        setError('');
      } else {
        setLoadState('ready');
        setError('');
      }
    } catch {
      setRows([]);
      setProgress([]);
      setLearnersFailed(true);
      setLoadState('failed');
      setError(tx('paths:pilotLoadFail'));
    }
  }, [classCode, classroom]);

  useEffect(() => {
    if (!classroom) {
      setLoadState('idle');
      return;
    }
    let cancel = false;
    void (async () => {
      await load();
      if (cancel) return;
    })();
    return () => {
      cancel = true;
    };
  }, [classroom, load, reloadToken]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    },
    []
  );

  if (!classroom) {
    return (
      <section data-testid="pilot-overview" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{tx('paths:pilotTitle')}</h2>
        <p className="mt-3 text-sm text-muted-foreground" data-testid="pilot-waiting">
          {tx('paths:pilotLoading')}
        </p>
      </section>
    );
  }

  const averages = classAverages(rows, progress);
  const totalSeconds = rows.reduce((sum, row) => sum + row.timeSeconds, 0);
  const teacherCount = 1;
  const metricsUnavailable = loadState === 'failed' || loadState === 'loading';
  const progressUnavailable = metricsUnavailable || (learnersFailed && rows.every((row) => row.legacyOnly));

  const saveGoals = async () => {
    setSaving(true);
    setMessage('');
    try {
      const next = { ...goals, updatedAt: Date.now() };
      await getPort(classCode, false).saveGoals(classCode, next);
      setGoals(next);
      setMessage(tx('paths:pilotSaved'));
      toast.success(tx('paths:pilotSaved'));
    } catch {
      setMessage('');
      setError(tx('paths:pilotSaveFail'));
      toast.error(tx('paths:pilotSaveFail'));
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const csv = reportsToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    link.href = url;
    link.download = csvFilename(isDemoMode());
    link.click();
  };

  return (
    <section data-testid="pilot-overview" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{tx('paths:pilotTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{tx('paths:pilotTeacherNote')}</p>
      </div>

      {loadState === 'loading' && (
        <p className="mb-4 text-sm text-muted-foreground" data-testid="pilot-loading" role="status">
          {tx('paths:pilotLoading')}
        </p>
      )}

      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p className="flex-1">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="min-h-[48px]"
            data-testid="pilot-retry"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            {tx('paths:pilotRetry')}
          </Button>
        </div>
      )}

      {learnersFailed && loadState === 'partial' && (
        <p className="mb-3 text-sm text-muted-foreground" data-testid="pilot-legacy-note">
          {tx('paths:pilotLegacyOnly')}
        </p>
      )}

      <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric
          label={tx('paths:pilotStudents')}
          value={averages.students}
          unavailable={metricsUnavailable}
        />
        <Metric label={tx('paths:pilotTeachers')} value={teacherCount} unavailable={metricsUnavailable} />
        <Metric
          label={tx('paths:pilotProgress')}
          value={formatPercent(averages.averageProgress)}
          unavailable={progressUnavailable}
        />
        <Metric
          label={tx('paths:pilotImprovement')}
          value={
            averages.averageImprovement === null
              ? tx('paths:pilotNotAvailable')
              : formatCsvNumber(averages.averageImprovement)
          }
          unavailable={progressUnavailable || averages.averageImprovement === null}
        />
        <Metric
          label={tx('paths:pilotEngagement')}
          value={formatMinutes(totalSeconds)}
          unavailable={progressUnavailable}
        />
      </dl>

      {loadState !== 'loading' && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-start text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-3 font-medium">{tx('paths:dashStudent')}</th>
                <th className="px-3 py-3 font-medium">{tx('paths:dashCurriculum')}</th>
                <th className="px-3 py-3 font-medium">{tx('paths:dashPlanet')}</th>
                <th className="px-3 py-3 font-medium">{tx('paths:dashAssessment')}</th>
                <th className="px-3 py-3 font-medium">{tx('paths:dashAccuracy')}</th>
                <th className="px-3 py-3 font-medium">{tx('paths:dashTime')}</th>
                <th className="px-3 py-3 font-medium">{tx('paths:dashStruggling')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.spaceName} className="border-t border-border">
                  <th className="px-3 py-3 font-medium" scope="row">
                    {row.spaceName}
                    {row.legacyOnly ? (
                      <span className="ms-2 text-xs font-normal text-muted-foreground">
                        ({tx('paths:pilotLegacyTag')})
                      </span>
                    ) : null}
                  </th>
                  <td className="px-3 py-3">{row.curriculumId || tx('paths:noneYet')}</td>
                  <td className="px-3 py-3">{row.currentNodeId || tx('paths:noneYet')}</td>
                  <td className="px-3 py-3">
                    {row.latestAssessment ? row.latestAssessment.recommendedNodeId : tx('paths:noneYet')}
                  </td>
                  <td className="px-3 py-3" dir="ltr">
                    {row.legacyOnly ? tx('paths:pilotNotAvailable') : formatPercent(row.accuracy)}
                  </td>
                  <td className="px-3 py-3" dir="ltr">
                    {row.legacyOnly ? tx('paths:pilotNotAvailable') : formatMinutes(row.timeSeconds)}
                  </td>
                  <td className="px-3 py-3">{row.struggling.join(', ') || tx('paths:noneYet')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        loadState === 'empty' && (
          <p
            className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground"
            data-testid="pilot-empty"
          >
            {tx('paths:noneYet')}
          </p>
        )
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{tx('paths:pilotNow')}</span>
          <textarea
            className="min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2"
            value={goals.whereWeAre}
            onChange={(event) => setGoals({ ...goals, whereWeAre: event.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{tx('paths:pilotWant')}</span>
          <textarea
            className="min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2"
            value={goals.whereWeWant}
            onChange={(event) => setGoals({ ...goals, whereWeWant: event.target.value })}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-[48px]"
          disabled={saving}
          data-testid="pilot-save-goals"
          onClick={() => void saveGoals()}
        >
          {tx('paths:pilotSave')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-[48px]"
          data-testid="export-csv"
          disabled={rows.length === 0}
          onClick={exportCsv}
        >
          {tx('paths:exportCsv')}
        </Button>
      </div>
      {message && <p className="mt-2 text-sm text-success">{message}</p>}
    </section>
  );
};

export default PilotOverview;
