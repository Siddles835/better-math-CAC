import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClass, Classroom, setClassDefaultStart, updateStudentState } from '@/lib/classroom';
import { getDescription } from '@/lib/planetDescriptions';

const TeacherDashboard: React.FC = () => {
  const params = useParams();
  const classCode = params['*'] || (params as any).classCode || '';
  const navigate = useNavigate();
  const [cls, setCls] = useState<Classroom | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [defaultPlanet, setDefaultPlanet] = useState('mercury');
  const [defaultLesson, setDefaultLesson] = useState<'counting' | 'addition' | 'subtraction'>('counting');

  useEffect(() => {
    const load = () => setCls(getClass(classCode));
    load();
    const onStorage = (e: StorageEvent) => load();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [classCode]);

  if (!classCode) return <div>No class code provided</div>;

  const handleSetDefault = () => {
    setClassDefaultStart(classCode, defaultPlanet, defaultLesson);
    setCls(getClass(classCode));
  };

  const handleOverride = (nickname: string) => {
    if (!cls) return;
    const student = cls.students[nickname];
    if (!student) return;
    // allow teacher to set student to default values selected
    const updated = { ...student, planet: defaultPlanet, lesson: defaultLesson };
    updateStudentState(classCode, updated);
    setCls(getClass(classCode));
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Teacher Dashboard — {classCode}</h1>
          <div>
            <button onClick={() => navigate('/')} className="btn">Home</button>
          </div>
        </div>

        <section className="mb-6 bg-card p-4 rounded">
          <h2 className="font-medium mb-2">Class Default Start</h2>
          <div className="flex gap-3 items-center">
            <select value={defaultPlanet} onChange={e => setDefaultPlanet(e.target.value)} className="input">
              <option value="mercury">Mercury</option>
              <option value="venus">Venus</option>
              <option value="earth">Earth</option>
              <option value="mars">Mars</option>
              <option value="jupiter">Jupiter</option>
              <option value="saturn">Saturn</option>
              <option value="uranus">Uranus</option>
              <option value="neptune">Neptune</option>
            </select>
            <select value={defaultLesson} onChange={e => setDefaultLesson(e.target.value as any)} className="input">
              <option value="counting">Counting</option>
              <option value="addition">Addition</option>
              <option value="subtraction">Subtraction</option>
            </select>
            <button onClick={handleSetDefault} className="btn btn-primary">Set Default</button>
          </div>
        </section>

        <section className="bg-card p-4 rounded">
          <h2 className="font-medium mb-4">Students</h2>
          {!cls || Object.keys(cls.students).length === 0 ? (
            <div>No students yet</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(cls.students).map(s => (
                <div key={s.nickname} className="p-3 rounded border">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{s.nickname}</div>
                      <div className="text-sm text-muted-foreground">{s.planet} — {s.lesson}</div>
                      <div className="text-xs text-muted-foreground mt-2">{getDescription(s.planet as any, s.lesson as any)}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setSelectedStudent(s.nickname)} className="btn">View</button>
                      <button onClick={() => handleOverride(s.nickname)} className="btn btn-secondary">Override to Default</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default TeacherDashboard;
