import { tx } from '@/i18n/tx';
import { useEffect, useState } from 'react';
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

const Metric = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-xl border border-border bg-background/50 p-4">
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground" dir="ltr">
      {value}
    </dd>
  </div>
);

const PilotOverview = ({ classCode, classroom }: { classCode: string; classroom: Classroom | null }) => {
  const [goals, setGoals] = useState<PilotGoals>({ whereWeAre: '', whereWeWant: '', updatedAt: 0 });
  const [rows, setRows] = useState<ReturnType<typeof studentReport>[]>([]);
  const [progress, setProgress] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!classroom) return;
    let cancel = false;
    void (async () => {
      try {
        const port = getPort(classCode, false);
        const [learners, assignments, curricula, storedGoals] = await Promise.all([
          port.listLearners(classCode),
          port.listAssignments(classCode),
          port.listCurricula(classCode),
          port.getGoals(classCode),
        ]);
        if (cancel) return;
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
        setError('');
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : tx('paths:currError'));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [classCode, classroom]);

  const averages = classAverages(rows, progress);
  const weeks = rows.map((row) => row.timeSeconds);

  const saveGoals = async () => {
    const next = { ...goals, updatedAt: Date.now() };
    await getPort(classCode, false).saveGoals(classCode, next);
    setGoals(next);
    setMessage(tx('paths:pilotSaved'));
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
        <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label={tx('paths:pilotStudents')} value={averages.students} />
        <Metric label={tx('paths:pilotTeachers')} value={classroom ? 1 : averages.teachers} />
        <Metric label={tx('paths:pilotProgress')} value={formatCsvNumber(averages.averageProgress)} />
        <Metric label={tx('paths:pilotImprovement')} value={formatCsvNumber(averages.averageImprovement)} />
        <Metric
          label={tx('paths:pilotEngagement')}
          value={formatCsvNumber(weeks.reduce((sum, value) => sum + value, 0))}
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
                    {formatCsvNumber(row.timeSeconds)}
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
