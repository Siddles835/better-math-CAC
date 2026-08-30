import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizeLabel, verifyTeacherPin } from '@/lib/classroom';
import { setActiveTeacher } from '@/lib/session';
import AuthNavButton from '@/components/AuthNavButton';

const TeacherLoginPage: React.FC = () => {
  const [classCode, setClassCode] = useState('');
  const [teacherPin, setTeacherPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeLabel(classCode);
    const pin = normalizeLabel(teacherPin);
    if (!code || !pin || loading) return;

    setLoading(true);
    setError('');

    try {
      const result = await verifyTeacherPin(code, pin);
      if (result.ok === false) {
        setError(result.reason);
        return;
      }

      setActiveTeacher({ classCode: result.classCode, teacherCode: result.teacherCode });
      navigate(`/teacher/${result.classCode}`, { replace: true });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Check your connection.';
      setError('Failed to login: ' + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background subtle-stars flex items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md bg-card/95 p-6 rounded-2xl shadow-lg border border-border animate-fade-in backdrop-blur-sm">
        <h2 className="text-2xl font-semibold mb-2">Teacher Login</h2>
        <p className="text-muted-foreground mb-6">
          Enter your class code and teacher PIN to open the live dashboard.
        </p>

        <form onSubmit={handleLogin}>
          <label className="block mb-2 font-medium">Class Code</label>
          <input
            value={classCode}
            onChange={(e) => {
              setClassCode(e.target.value);
              setError('');
            }}
            className="w-full mb-4 text-foreground bg-background px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow min-h-[48px]"
            placeholder="Enter your class code"
            required
            disabled={loading}
            autoComplete="off"
            autoCapitalize="none"
          />

          <label className="block mb-2 font-medium">Teacher PIN</label>
          <input
            value={teacherPin}
            onChange={(e) => {
              setTeacherPin(e.target.value);
              setError('');
            }}
            className="w-full mb-4 text-foreground bg-background px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow min-h-[48px] tracking-widest"
            placeholder="PIN shown when you created the class"
            required
            disabled={loading}
            autoComplete="off"
            autoCapitalize="characters"
          />

          {error && (
            <div className="mb-4 p-3 bg-destructive/15 text-destructive rounded-xl text-sm border border-destructive/30">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end mt-4">
            <AuthNavButton onClick={() => navigate('/')} />
            <button
              type="submit"
              disabled={loading}
              className="bg-sky-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-sky-500 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none min-h-[48px]"
            >
              {loading ? 'Loading…' : 'Enter Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherLoginPage;
