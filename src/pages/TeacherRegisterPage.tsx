import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkClassExists, createClass, normalizeLabel } from '@/lib/classroom';
import { setActiveTeacher } from '@/lib/session';
import AuthNavButton from '@/components/AuthNavButton';

const TeacherRegisterPage: React.FC = () => {
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeLabel(classCode);
    if (!code || loading) return;

    setLoading(true);
    setError('');

    try {
      const exists = await checkClassExists(code);
      if (exists) {
        setError(`Class code "${code}" is already taken. Please choose a different one.`);
        return;
      }

      const created = await createClass(code);
      setActiveTeacher({ classCode: created.classCode, teacherCode: created.teacherCode });
      setCreatedCode(created.classCode);
      setCreatedPin(created.teacherCode);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Check your connection.';
      setError('Failed to create class: ' + message);
    } finally {
      setLoading(false);
    }
  };

  if (createdCode && createdPin) {
    return (
      <div className="min-h-screen bg-background subtle-stars flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md bg-card/95 p-6 rounded-2xl shadow-lg border border-border animate-fade-in backdrop-blur-sm">
          <h2 className="text-2xl font-semibold mb-2">Class Created</h2>
          <p className="text-muted-foreground mb-6">
            Save these codes. Students need the class code. You need the teacher PIN to manage the
            class later.
          </p>
          <div className="space-y-4 mb-6">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-sm text-muted-foreground mb-1">Student class code</p>
              <p className="text-2xl font-bold tracking-wide text-foreground">{createdCode}</p>
            </div>
            <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-4">
              <p className="text-sm text-sky-200/80 mb-1">Teacher PIN (keep private)</p>
              <p className="text-2xl font-bold tracking-widest text-foreground">{createdPin}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/teacher/${createdCode}`, { replace: true })}
            className="w-full bg-sky-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-sky-500 active:scale-[0.98] transition-all duration-200 min-h-[48px]"
          >
            Open Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background subtle-stars flex items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md bg-card/95 p-6 rounded-2xl shadow-lg border border-border animate-fade-in backdrop-blur-sm">
        <h2 className="text-2xl font-semibold mb-2">Create a Class</h2>
        <p className="text-muted-foreground mb-6">
          Pick a unique class code students will use to join on phones, tablets, and computers.
        </p>

        <form onSubmit={handleRegister}>
          <label className="block mb-2 font-medium">New Class Code</label>
          <input
            value={classCode}
            onChange={(e) => {
              setClassCode(e.target.value);
              setError('');
            }}
            className="w-full mb-4 text-foreground bg-background px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow min-h-[48px]"
            placeholder="e.g., math101"
            required
            disabled={loading}
            autoComplete="off"
            autoCapitalize="none"
          />

          {error && (
            <div className="mb-4 p-3 bg-destructive/15 text-destructive rounded-xl text-sm border border-destructive/30">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end mt-4">
            <AuthNavButton onClick={() => navigate('/')} label="Cancel" />
            <button
              type="submit"
              disabled={loading}
              className="bg-sky-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-sky-500 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none min-h-[48px]"
            >
              {loading ? 'Creating…' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherRegisterPage;
