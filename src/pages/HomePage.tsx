import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  clearActiveStudent,
  clearActiveTeacher,
  getActiveStudent,
  getActiveTeacher,
  getStudentDisplayName,
  reconcileExclusiveSession,
  SESSION_CHANGED,
  type ActiveStudent,
  type ActiveTeacher,
} from '@/lib/session';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [studentSession, setStudentSession] = useState<ActiveStudent | null>(null);
  const [teacherSession, setTeacherSession] = useState<ActiveTeacher | null>(null);

  useEffect(() => {
    const sync = () => {
      reconcileExclusiveSession();
      setStudentSession(getActiveStudent());
      setTeacherSession(getActiveTeacher());
    };
    sync();
    window.addEventListener(SESSION_CHANGED, sync);
    return () => window.removeEventListener(SESSION_CHANGED, sync);
  }, []);

  const handleStudentSignOut = () => {
    clearActiveStudent();
    setStudentSession(null);
  };

  const handleTeacherSignOut = () => {
    clearActiveTeacher();
    setTeacherSession(null);
  };

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col items-center justify-center p-8">
      <div className="animate-fade-in text-center">
        <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-sun/30 flex items-center justify-center animate-gentle-float">
          <div className="w-24 h-24 rounded-full bg-sun/50 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-sun" />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-4">
          MathLift
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-3">
          A K–2 classroom for counting, addition, and subtraction. Students travel a solar system.
          The app notices how they think — on the device — so a teacher can pull a five-minute
          group before a gap becomes a grade.
        </p>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-8">
          Generated space names. Drawings stay on the device.{' '}
          <Link to="/how-it-works" className="underline underline-offset-2 hover:text-foreground">
            How it works
          </Link>
          {' · '}
          <Link to="/classroom" className="underline underline-offset-2 hover:text-foreground">
            Sample classroom
          </Link>
          {' · '}
          <Link to="/methods" className="underline underline-offset-2 hover:text-foreground">
            Methods
          </Link>
        </p>
      </div>

      {(studentSession || teacherSession) && (
        <div className="w-full max-w-2xl mb-6 space-y-3 animate-fade-in">
          {studentSession && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
              <div className="flex-1 text-left">
                <p className="text-sm text-emerald-200/80">Signed in as student</p>
                <p className="text-lg font-semibold text-foreground">
                  {getStudentDisplayName(studentSession)}
                  <span className="text-muted-foreground font-normal"> · {studentSession.classCode}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(STUDENT_HUB_PATH)}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-base font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.98] transition-all duration-200 shadow-sm"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={handleStudentSignOut}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-base font-semibold rounded-xl border border-border bg-card/80 text-foreground hover:bg-muted active:scale-[0.98] transition-all duration-200"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
          {teacherSession && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-2xl border border-sky-500/30 bg-sky-500/10">
              <div className="flex-1 text-left">
                <p className="text-sm text-sky-200/80">Signed in as teacher</p>
                <p className="text-lg font-semibold text-foreground">
                  Class {teacherSession.classCode}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/teacher/${teacherSession.classCode}`)}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-base font-semibold rounded-xl bg-sky-600 text-white hover:bg-sky-500 active:scale-[0.98] transition-all duration-200 shadow-sm"
                >
                  Open Dashboard
                </button>
                <button
                  type="button"
                  onClick={handleTeacherSignOut}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-base font-semibold rounded-xl border border-border bg-card/80 text-foreground hover:bg-muted active:scale-[0.98] transition-all duration-200"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 w-full max-w-2xl animate-fade-in">
        <div className="flex flex-col gap-4 p-6 bg-card/90 rounded-2xl shadow-md border border-border backdrop-blur-sm">
          <h2 className="text-2xl font-semibold text-center mb-2">Students</h2>
          <button
            type="button"
            onClick={() => navigate('/student-register')}
            className="w-full px-6 py-3 text-lg font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.98] transition-all duration-200 shadow-sm"
          >
            New Student (Join Class)
          </button>
          <button
            type="button"
            onClick={() => navigate('/student-login')}
            className="w-full px-6 py-3 text-lg font-semibold rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-200 active:scale-[0.98] transition-all duration-200 shadow-sm"
          >
            Returning Student (Login)
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6 bg-card/90 rounded-2xl shadow-md border border-border backdrop-blur-sm">
          <h2 className="text-2xl font-semibold text-center mb-2">Teachers</h2>
          <button
            type="button"
            onClick={() => navigate('/teacher-register')}
            className="w-full px-6 py-3 text-lg font-semibold rounded-xl bg-sky-600 text-white hover:bg-sky-500 active:scale-[0.98] transition-all duration-200 shadow-sm"
          >
            Create Class
          </button>
          <button
            type="button"
            onClick={() => navigate('/teacher-login')}
            className="w-full px-6 py-3 text-lg font-semibold rounded-xl bg-sky-100 text-sky-900 hover:bg-sky-200 active:scale-[0.98] transition-all duration-200 shadow-sm"
          >
            Manage Class (Login)
          </button>
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-muted-foreground flex flex-wrap justify-center gap-x-4 gap-y-2">
        <Link to="/classroom" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
          Sample classroom
        </Link>
        <Link to="/how-it-works" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
          How it works
        </Link>
        <Link to="/methods" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
          Methods
        </Link>
        <Link to="/settings" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
          Settings
        </Link>
        <Link to="/support" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
          Support
        </Link>
        <Link to="/privacy-policy" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        <Link to="/cookie-policy" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
          Cookie Policy
        </Link>
      </footer>
    </div>
  );
};

export default HomePage;
