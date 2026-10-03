import { tx } from '@/i18n/tx';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ClassTrends from '@/components/ClassTrends';
import { Button } from '@/components/ui/button';
import { briefingHeadline, buildClassBriefing, misconceptionLabel } from '@/lib/cognition';
import { SAMPLE_CLASS_CODE, SAMPLE_STUDENTS } from '@/lib/cognition/demoClass';
import { resolvedStudents } from '@/lib/cognition/trends';
import { subscribeToClass, type Classroom } from '@/lib/classroom';
import { requestPrint } from '@/lib/nativeShell';

const PrintBriefingPage: React.FC = () => {
  const params = useParams();
  const classCode = params.classCode || '';
  const navigate = useNavigate();
  const sample = classCode.toUpperCase() === SAMPLE_CLASS_CODE;
  const [cls, setCls] = useState<Classroom | null>(null);

  useEffect(() => {
    if (!classCode || sample) return;
    return subscribeToClass(classCode, setCls);
  }, [classCode, sample]);

  const students = sample ? SAMPLE_STUDENTS : cls ? Object.values(cls.students ?? {}) : [];
  const briefing = buildClassBriefing(students);
  const resolved = resolvedStudents(students);
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="print-sheet bg-white text-black min-h-screen px-4 py-4">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => navigate(`/teacher/${classCode}`)}>{tx('ui:s_b52b36b726')}</Button>
        <Button type="button" onClick={() => requestPrint()}>{tx('ui:s_e39c15d303')}</Button>
      </div>
      <header className="avoid-break mb-3">
        <p className="text-xs uppercase tracking-wide">{tx('ui:s_f384180ae6')}</p>
        <h1 className="text-2xl font-semibold">
          {sample ? 'Sample class' : `Class ${classCode}`}
        </h1>
        <p className="text-sm">{today}</p>
        {sample && (
          <p className="text-sm font-medium">{tx('ui:s_95b4cf41e7')}</p>
        )}
        <p className="text-sm mt-1">{briefingHeadline(briefing)}</p>
      </header>
      <section className="avoid-break grid grid-cols-3 gap-2 mb-3 text-sm">
        <p>
          <strong>{briefing.total}</strong> students
        </p>
        <p>
          <strong>{briefing.onTrack}</strong>{tx('ui:s_464e4361f3')}</p>
        <p>
          <strong>{briefing.needsAttention}</strong>{tx('ui:s_c88063ab16')}</p>
      </section>
      <section className="avoid-break mb-3">
        <h2 className="text-base font-semibold mb-1">{tx('ui:s_27c81f3c40')}</h2>
        {briefing.actions.length === 0 ? (
          <p className="text-sm">{tx('ui:s_f352e0c991')}</p>
        ) : (
          briefing.actions.map((action) => (
            <div key={action.code} className="mb-2 text-sm">
              <p className="font-medium">
                {action.title} · {action.planetName} · {misconceptionLabel(action.code)}
              </p>
              <p>{action.detail}</p>
              <p>{action.students.join(', ')}</p>
            </div>
          ))
        )}
      </section>
      <section className="avoid-break mb-3 text-sm">
        <h2 className="text-base font-semibold">{tx('ui:s_4faa40cd1e')}</h2>
        <p>
          {resolved.length === 0
            ? 'None yet.'
            : resolved.map((row) => `${row.nickname} (${misconceptionLabel(row.from)})`).join(', ')}
        </p>
      </section>
      <ClassTrends students={students} sample={sample} compact />
    </main>
  );
};

export default PrintBriefingPage;
