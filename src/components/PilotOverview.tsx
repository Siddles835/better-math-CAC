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
          return studentReport(student.nickname || key, record, curriculum?.name ?? null, student.lastDiagnosis?.primary ?? null);
        });
        setRows(reports);
        setProgress(Object.entries(classroom.students ?? {}).map(([key, student]) => progressRatio(learners[key] ?? learnerFromLegacy(student))));
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
    <section data-testid="pilot-overview" className="mb-8 rounded-2xl border border-border bg-card/95 p-6">
      <h2 className="mb-2 text-xl font-semibold">{tx('paths:pilotTitle')}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{tx('paths:pilotTeacherNote')}</p>
      {error && <p className="mb-3 text-sm">{tx('paths:currError')}</p>}
      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div><dt>{tx('paths:pilotStudents')}</dt><dd className="text-lg font-semibold">{averages.students}</dd></div>
        <div><dt>{tx('paths:pilotTeachers')}</dt><dd className="text-lg font-semibold">{classroom ? 1 : averages.teachers}</dd></div>
        <div><dt>{tx('paths:pilotProgress')}</dt><dd className="text-lg font-semibold" dir="ltr">{formatCsvNumber(averages.averageProgress)}</dd></div>
        <div><dt>{tx('paths:pilotImprovement')}</dt><dd className="text-lg font-semibold" dir="ltr">{formatCsvNumber(averages.averageImprovement)}</dd></div>
        <div><dt>{tx('paths:pilotEngagement')}</dt><dd className="text-lg font-semibold" dir="ltr">{formatCsvNumber(weeks.reduce((sum, value) => sum + value, 0))}</dd></div>
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full text-start text-sm">
          <thead>
            <tr>
              <th className="py-2 pe-2">{tx('paths:dashPlanet')}</th>
              <th className="py-2 pe-2">{tx('paths:dashCurriculum')}</th>
              <th className="py-2 pe-2">{tx('paths:dashAssessment')}</th>
              <th className="py-2 pe-2">{tx('paths:dashAccuracy')}</th>
              <th className="py-2 pe-2">{tx('paths:dashTime')}</th>
              <th className="py-2">{tx('paths:dashStruggling')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.spaceName} className="border-t border-border">
                <th className="py-2 pe-2 font-medium" scope="row">{row.spaceName}</th>
                <td className="py-2 pe-2">{row.curriculumId || tx('paths:noneYet')}</td>
                <td className="py-2 pe-2">{row.latestAssessment ? row.latestAssessment.recommendedNodeId : tx('paths:noneYet')}</td>
                <td className="py-2 pe-2" dir="ltr">{formatCsvNumber(row.accuracy)}</td>
                <td className="py-2 pe-2" dir="ltr">{formatCsvNumber(row.timeSeconds)}</td>
                <td className="py-2">{row.struggling.join(', ') || tx('paths:noneYet')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{tx('paths:dashPlanet')}: {rows.map((row) => `${row.spaceName} ${row.activePathId} ${row.currentNodeId}`).join(' · ')}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          {tx('paths:pilotNow')}
          <textarea className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={goals.whereWeAre} onChange={(event) => setGoals({ ...goals, whereWeAre: event.target.value })} />
        </label>
        <label className="block text-sm">
          {tx('paths:pilotWant')}
          <textarea className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2" value={goals.whereWeWant} onChange={(event) => setGoals({ ...goals, whereWeWant: event.target.value })} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" className="min-h-[48px]" onClick={() => void saveGoals()}>{tx('paths:pilotSave')}</Button>
        <Button type="button" variant="outline" className="min-h-[48px]" data-testid="export-csv" onClick={exportCsv}>{tx('paths:exportCsv')}</Button>
      </div>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </section>
  );
};

export default PilotOverview;
