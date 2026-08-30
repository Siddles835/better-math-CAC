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
import { deleteClassroom, deleteStudent } from '@/lib/classroom';
import { Button } from '@/components/ui/button';

const SUPPORT_EMAIL = 'mathlift1234@gmail.com';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState<ActiveStudent | null>(null);
  const [teacher, setTeacher] = useState<ActiveTeacher | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<'student' | 'class' | null>(null);

  const refresh = () => {
    reconcileExclusiveSession();
    setStudent(getActiveStudent());
    setTeacher(getActiveTeacher());
  };

  useEffect(() => {
    refresh();
    window.addEventListener(SESSION_CHANGED, refresh);
    return () => window.removeEventListener(SESSION_CHANGED, refresh);
  }, []);

  const handleStudentSignOut = () => {
    clearActiveStudent();
    refresh();
    navigate('/', { replace: true });
  };

  const handleTeacherSignOut = () => {
    clearActiveTeacher();
    refresh();
    navigate('/', { replace: true });
  };

  const handleDeleteStudent = async () => {
    if (!student || busy) return;
    setBusy(true);
    setMessage('');
    try {
      await deleteStudent(student.classCode, student.nickname);
      clearActiveStudent();
      setConfirmDelete(null);
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setMessage('Could not delete this account. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!teacher || busy) return;
    setBusy(true);
    setMessage('');
    try {
      await deleteClassroom(teacher.classCode);
      clearActiveTeacher();
      setConfirmDelete(null);
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setMessage('Could not delete this class. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background subtle-stars text-foreground pb-[max(2rem,env(safe-area-inset-bottom))]">
      <main className="mx-auto max-w-lg px-6 py-10 animate-fade-in">
        <h1 className="text-3xl font-semibold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">
          Privacy, account, and classroom controls. MathLift never uses student data for ads.
        </p>

        {student && (
          <section className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <p className="text-sm text-emerald-200/80">Signed in as student</p>
            <p className="text-lg font-semibold mt-1">
              {getStudentDisplayName(student)}
              <span className="text-muted-foreground font-normal"> · {student.classCode}</span>
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button type="button" variant="outline" onClick={handleStudentSignOut}>
                Sign Out
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDelete('student')}
              >
                Delete My Account
              </Button>
            </div>
          </section>
        )}

        {teacher && (
          <section className="mb-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
            <p className="text-sm text-sky-200/80">Signed in as teacher</p>
            <p className="text-lg font-semibold mt-1">Class {teacher.classCode}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/teacher/${teacher.classCode}`)}
              >
                Open Dashboard
              </Button>
              <Button type="button" variant="outline" onClick={handleTeacherSignOut}>
                Sign Out
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDelete('class')}
              >
                Delete This Class
              </Button>
            </div>
          </section>
        )}

        {!student && !teacher && (
          <section className="mb-6 rounded-2xl border border-border bg-card/90 p-5">
            <p className="text-muted-foreground mb-3">You are not signed in on this device.</p>
            <Button type="button" onClick={() => navigate('/')}>
              Go Home
            </Button>
          </section>
        )}

        {confirmDelete === 'student' && (
          <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
            <p className="font-semibold mb-2">Delete this student account?</p>
            <p className="text-sm text-muted-foreground mb-4">
              This permanently removes the space name, planet progress, and quiz history from the
              class. It cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="destructive" disabled={busy} onClick={handleDeleteStudent}>
                {busy ? 'Deleting…' : 'Yes, delete my account'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {confirmDelete === 'class' && (
          <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
            <p className="font-semibold mb-2">Delete this entire class?</p>
            <p className="text-sm text-muted-foreground mb-4">
              This permanently removes the class code, teacher PIN, student roster, and all progress.
              Students will no longer be able to log in with this code.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="destructive" disabled={busy} onClick={handleDeleteClass}>
                {busy ? 'Deleting…' : 'Yes, delete this class'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {message && (
          <p className="mb-6 text-sm text-destructive">{message}</p>
        )}

        <section className="mb-6 rounded-2xl border border-border bg-card/90 p-5 space-y-3">
          <h2 className="text-xl font-semibold">Privacy &amp; data</h2>
          <p className="text-sm text-muted-foreground">
            MathLift collects only a generated space name, class code, and lesson progress so the
            classroom app can work. We do not sell data, run ads, or build advertising profiles.
          </p>
          <div className="flex flex-col gap-2">
            <Link to="/privacy-policy" className="text-primary font-medium hover:underline min-h-[44px] flex items-center">
              Privacy Policy
            </Link>
            <Link to="/cookie-policy" className="text-primary font-medium hover:underline min-h-[44px] flex items-center">
              Cookie Policy
            </Link>
            <Link to="/support" className="text-primary font-medium hover:underline min-h-[44px] flex items-center">
              Support
            </Link>
            {!teacher && (
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=MathLift%20data%20deletion%20request`}
                className="text-primary font-medium hover:underline min-h-[44px] flex items-center"
              >
                Email a deletion request ({SUPPORT_EMAIL})
              </a>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default SettingsPage;
