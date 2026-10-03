import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ClassTrends from '@/components/ClassTrends';
import { Button } from '@/components/ui/button';
import { briefingHeadline, buildClassBriefing, MISCONCEPTION_LABEL } from '@/lib/cognition';
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
        <Button type="button" variant="outline" onClick={() => navigate(`/teacher/${classCode}`)}>
          Back
        </Button>
        <Button type="button" onClick={() => requestPrint()}>
          Print / Save as PDF
        </Button>
      </div>
      <header className="avoid-break mb-3">
        <p className="text-xs uppercase tracking-wide">MathLift class briefing</p>
        <h1 className="text-2xl font-semibold">
          {sample ? 'Sample class' : `Class ${classCode}`}
        </h1>
        <p className="text-sm">{today}</p>
        {sample && (
          <p className="text-sm font-medium">Sample data. These names are examples, not a real class.</p>
        )}
        <p className="text-sm mt-1">{briefingHeadline(briefing)}</p>
      </header>
      <section className="avoid-break grid grid-cols-3 gap-2 mb-3 text-sm">
        <p>
          <strong>{briefing.total}</strong> students
        </p>
        <p>
          <strong>{briefing.onTrack}</strong> on track
        </p>
        <p>
          <strong>{briefing.needsAttention}</strong> need attention
        </p>
      </section>
      <section className="avoid-break mb-3">
        <h2 className="text-base font-semibold mb-1">Tomorrow's ten minutes</h2>
        {briefing.actions.length === 0 ? (
          <p className="text-sm">No pull-out group from the latest checks.</p>
        ) : (
          briefing.actions.map((action) => (
            <div key={action.code} className="mb-2 text-sm">
              <p className="font-medium">
                {action.title} · {action.planetName} · {MISCONCEPTION_LABEL[action.code]}
              </p>
              <p>{action.detail}</p>
              <p>{action.students.join(', ')}</p>
            </div>
          ))
        )}
      </section>
      <section className="avoid-break mb-3 text-sm">
        <h2 className="text-base font-semibold">Resolved this month</h2>
        <p>
          {resolved.length === 0
            ? 'None yet.'
            : resolved.map((row) => `${row.nickname} (${MISCONCEPTION_LABEL[row.from]})`).join(', ')}
        </p>
      </section>
      <ClassTrends students={students} sample={sample} compact />
    </main>
  );
};

export default PrintBriefingPage;
