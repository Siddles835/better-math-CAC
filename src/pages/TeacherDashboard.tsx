import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClass, Classroom, setClassDefaultStart, updateStudentState } from '@/lib/classroom';
import { getDescription } from '@/lib/planetDescriptions';

const TeacherDashboard: React.FC = () => {
  const params = useParams();
  const classCode = params['*'] || (params as any).classCode || '';
  const navigate = useNavigate();
  const [cls, setCls] = useState<Classroom | null>(null);
  const [defaultPlanet, setDefaultPlanet] = useState('mercury');
  const [defaultLesson, setDefaultLesson] = useState<'counting' | 'addition' | 'subtraction'>('counting');

  useEffect(() => {
    if (!classCode) return;
    
    const load = () => {
      const data = getClass(classCode);
      setCls(data);
      if (data) {
        setDefaultPlanet(data.defaultPlanet);
        setDefaultLesson(data.defaultLesson as any);
      }
    };
    
    load();
    
    // This allows the teacher dashboard to update in real-time 
    // when a student on the SAME computer/browser saves progress.
    const onStorage = () => load();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [classCode]);

  if (!classCode) return <div className="p-8 text-center text-xl">No class code provided</div>;

  const handleSetDefault = () => {
    setClassDefaultStart(classCode, defaultPlanet, defaultLesson);
    setCls(getClass(classCode));
  };

  const handleOverride = (nickname: string) => {
    if (!cls) return;
    const student = cls.students[nickname];
    if (!student) return;
    
    const updated = { ...student, planet: defaultPlanet, lesson: defaultLesson };
    updateStudentState(classCode, updated);
    setCls(getClass(classCode)); // refresh UI
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Teacher Dashboard — {classCode}</h1>
          <button onClick={() => navigate('/')} className="btn bg-gray-200 px-4 py-2 rounded">Sign Out</button>
        </div>

        <section className="mb-8 bg-card p-6 rounded-lg shadow border border-gray-100">
          <h2 className="text-xl font-semibold mb-4">Class Default Start Point</h2>
          <p className="text-sm text-muted-foreground mb-4">New students will start here. You can also override existing students to this location.</p>
          <div className="flex flex-wrap gap-4 items-center">
            <select value={defaultPlanet} onChange={e => setDefaultPlanet(e.target.value)} className="input border rounded px-3 py-2 text-black">
              <option value="mercury">Mercury</option>
              <option value="venus">Venus</option>
              <option value="earth">Earth</option>
              <option value="mars">Mars</option>
              <option value="jupiter">Jupiter</option>
              <option value="saturn">Saturn</option>
              <option value="uranus">Uranus</option>
              <option value="neptune">Neptune</option>
            </select>
            <select value={defaultLesson} onChange={e => setDefaultLesson(e.target.value as any)} className="input border rounded px-3 py-2 text-black">
              <option value="counting">Counting</option>
              <option value="addition">Addition</option>
              <option value="subtraction">Subtraction</option>
            </select>
            <button onClick={handleSetDefault} className="btn btn-primary bg-sky-600 text-white px-4 py-2 rounded">Update Default</button>
          </div>
        </section>

        <section className="bg-card p-6 rounded-lg shadow border border-gray-100">
          <h2 className="text-xl font-semibold mb-4">Student Roster & Progress</h2>
          {!cls || Object.keys(cls.students).length === 0 ? (
            <div className="p-4 bg-gray-50 text-gray-500 rounded text-center border border-dashed border-gray-300">
              No students have joined this class yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(cls.students).map(s => (
                <div key={s.nickname} className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col justify-between">
                  <div className="mb-4">
                    <div className="text-lg font-bold text-gray-800">{s.nickname}</div>
                    <div className="text-sm font-medium text-sky-600 uppercase tracking-wide mt-1">
                      {s.planet} — {s.lesson}
                    </div>
                    {/* Failsafe if getDescription is missing or undefined */}
                    <div className="text-xs text-gray-500 mt-2 italic">
                      {getDescription ? getDescription(s.planet as any, s.lesson as any) : "Currently exploring..."}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleOverride(s.nickname)} 
                    className="w-full btn btn-secondary bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded text-sm font-medium transition-colors"
                  >
                    Move to Default
                  </button>
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
