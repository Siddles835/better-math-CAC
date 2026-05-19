import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Classroom, setClassDefaultStart, subscribeToClass } from '@/lib/classroom';
import { getLessonForPlanet } from '@/lib/planets';
import { Button } from '@/components/ui/button';

const TeacherDashboard: React.FC = () => {
  const params = useParams();
  const classCode = params['*'] || (params as any).classCode || '';
  const navigate = useNavigate();
  const [cls, setCls] = useState<Classroom | null>(null);
  const [defaultPlanet, setDefaultPlanet] = useState('sun');
  const [savingDefault, setSavingDefault] = useState(false);
  const [defaultSaved, setDefaultSaved] = useState(false);

  useEffect(() => {
    if (!classCode) return;
    
    // Subscribe to real-time updates from Firebase
    const unsubscribe = subscribeToClass(classCode, (data) => {
      setCls(data);
      if (data?.defaultStart?.planet) {
        setDefaultPlanet(data.defaultStart.planet);
      }
    });
    
    // Cleanup the listener when the teacher leaves the dashboard
    return () => unsubscribe();
  }, [classCode]);

  if (!classCode) return <div className="p-8 text-center text-xl">No class code provided</div>;

  const derivedLesson = getLessonForPlanet(defaultPlanet);

  const handleSignOut = () => {
    localStorage.removeItem('better-math:active-teacher');
    navigate('/');
  };

  const handleDefaultChange = async (planet: string) => {
    setDefaultPlanet(planet);
    setDefaultSaved(false);
    setSavingDefault(true);
    try {
      await setClassDefaultStart(classCode, planet);
      setDefaultSaved(true);
    } finally {
      setSavingDefault(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Teacher Dashboard — {classCode}</h1>
          <Button
            type="button"
            variant="outline"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 border-border bg-card text-foreground hover:bg-muted shadow-sm"
          >
            <LogOut className="h-5 w-5 shrink-0 text-foreground" strokeWidth={2.25} aria-hidden />
            <span>Sign Out</span>
          </Button>
        </div>

        <section className="mb-8 bg-card p-6 rounded-lg shadow border border-gray-100">
          <h2 className="text-xl font-semibold mb-2">Class Default Start Point</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Students can pick any planet from the Sun through your selection. Saving happens as soon
            as you change the dropdown — students on the planet screen will update live.
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={defaultPlanet}
              onChange={(e) => handleDefaultChange(e.target.value)}
              disabled={savingDefault}
              className="input border rounded px-3 py-2 text-black"
            >
              <option value="sun">Sun</option>
              <option value="mercury">Mercury</option>
              <option value="venus">Venus</option>
              <option value="earth">Earth</option>
              <option value="mars">Mars</option>
              <option value="jupiter">Jupiter</option>
              <option value="saturn">Saturn</option>
              <option value="uranus">Uranus</option>
              <option value="neptune">Neptune</option>
            </select>
            <span className="text-sm font-medium text-sky-700 capitalize px-2">
              Lesson: {derivedLesson}
            </span>
            {savingDefault && (
              <span className="text-sm text-muted-foreground">Saving…</span>
            )}
            {defaultSaved && !savingDefault && (
              <span className="text-sm text-emerald-600 font-medium">Saved</span>
            )}
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
                <div key={s.nickname} className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="text-lg font-bold text-gray-800">{s.nickname}</div>
                    <div className="text-sm font-medium text-sky-600 uppercase tracking-wide mt-1">
                      {s.planet} — {s.lesson}
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
