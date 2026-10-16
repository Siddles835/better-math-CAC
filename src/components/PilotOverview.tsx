import { tx } from '@/i18n/tx';
import { useCallback, useEffect, useState } from 'react';
import type { Classroom } from '@/lib/classroom';
import type { PilotGoals } from '@/content/types';
import { getPort } from '@/lib/data/port';
import { resolveAssignment } from '@/lib/curriculum/logic';
import { learnerFromLegacy } from '@/lib/paths/progress';
import { classAverages, progressRatio, reportsToCsv, studentReport } from '@/lib/reporting/overview';
import { csvFilename } from '@/lib/reporting/csv';
import { formatCsvNumber } from '@/lib/reporting/csv';
import { isDemoMode } from '@/lib/demo/mode';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

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
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    if (!classroom) return;
    try {
      const port = getPort(classCode, false);
      const settled = await Promise.allSettled([
        port.listLearners(classCode),
        port.listAssignments(classCode),
        port.listCurricula(classCode),
        port.getGoals(classCode),
      ]);
      const learners = settled[0].status === 'fulfilled' ? settled[0].value : {};
      const assignments = settled[1].status === 'fulfilled' ? settled[1].value : [];
      const curricula = settled[2].status === 'fulfilled' ? settled[2].value : [];
      const storedGoals = settled[3].status === 'fulfilled' ? settled[3].value : null;
      const anyFailed = settled.some((result) => result.status === 'rejected');

      if (storedGoals) setGoals(storedGoals);
      const reports = Object.entries(classroom.students ?? {}).map(([key, student]) => {
        const record = learners[key] ?? learnerFromLegacy(student);
        const assignment = resolveAssignment(assignments, key, false);
        const curriculum = curricula.find((item) => item.id === assignment?.curriculumId);
        return studentReport(
          student.nickname || key,
          record,
          curriculum?.name ?? null,
          student.lastDiagnosis?.primary ?? null
        );
      });
      setRows(reports);
      setProgress(
        Object.entries(classroom.students ?? {}).map(([key, student]) =>
          progressRatio(learners[key] ?? learnerFromLegacy(student))
        )
      );
      setLoadFailed(anyFailed);
      setError(anyFailed ? tx('paths:pilotLoadPartial') : '');
    } catch {
      setLoadFailed(true);
      setRows([]);
      setProgress([]);
      setError(tx('paths:pilotLoadFail'));
    }
  }, [classCode, classroom]);

  useEffect(() => {
    if (!classroom) return;
    let cancel = false;
    void (async () => {
      if (cancel) return;
      await load();
    })();
    return () => {
      cancel = true;
    };
  }, [classroom, load, reloadToken]);

  const averages = classAverages(rows, progress);
  const totalSeconds = rows.reduce((sum, row) => sum + row.timeSeconds, 0);
  // Pilot classes currently have one owner teacher; classroom presence is the source of truth.
  const teacherCount = classroom ? 1 : averages.teachers;

  const saveGoals = async () => {
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
    }
  };

  const exportCsv = () => {
    const csv = reportsToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = csvFilename(isDemoMode());
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section data-testid="pilot-overview" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{tx('paths:pilotTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{tx('paths:pilotTeacherNote')}</p>
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p className="flex-1">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="min-h-[48px]"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            {tx('paths:pilotRetry')}
          </Button>
        </div>
      )}

      <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label={tx('paths:pilotStudents')} value={averages.students} unavailable={loadFailed && rows.length === 0} />
        <Metric label={tx('paths:pilotTeachers')} value={teacherCount} unavailable={loadFailed && !classroom} />
        <Metric
          label={tx('paths:pilotProgress')}
          value={formatCsvNumber(averages.averageProgress)}
          unavailable={loadFailed && rows.length === 0}
        />
        <Metric
          label={tx('paths:pilotImprovement')}
          value={formatCsvNumber(averages.averageImprovement)}
          unavailable={loadFailed && rows.length === 0}
        />
        <Metric
          label={tx('paths:pilotEngagement')}
          value={formatMinutes(totalSeconds)}
          unavailable={loadFailed && rows.length === 0}
        />
      </dl>

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-start text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-3 font-medium">{tx('paths:dashPlanet')}</th>
                <th className="px-3 py-3 font-medium">{tx('paths:dashCurriculum')}</th>
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
                  </th>
                  <td className="px-3 py-3">{row.curriculumId || tx('paths:noneYet')}</td>
                  <td className="px-3 py-3">
                    {row.latestAssessment ? row.latestAssessment.recommendedNodeId : tx('paths:noneYet')}
                  </td>
                  <td className="px-3 py-3" dir="ltr">
                    {formatCsvNumber(row.accuracy)}
                  </td>
                  <td className="px-3 py-3" dir="ltr">
                    {formatMinutes(row.timeSeconds)}
                  </td>
                  <td className="px-3 py-3">{row.struggling.join(', ') || tx('paths:noneYet')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !error && (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
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
        <Button type="button" className="min-h-[48px]" onClick={() => void saveGoals()}>
          {tx('paths:pilotSave')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-[48px]"
          data-testid="export-csv"
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
