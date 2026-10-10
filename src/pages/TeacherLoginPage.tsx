import { tx } from '@/i18n/tx';
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
        <h2 className="text-2xl font-semibold mb-2">{tx('ui:s_4e9496bc54')}</h2>
        <p className="text-muted-foreground mb-6">{tx('ui:s_7d9694d715')}</p>

        <form onSubmit={handleLogin}>
          <label htmlFor="teacher-class-code" className="block mb-2 font-medium">{tx('ui:s_554850d9a1')}</label>
          <input
            id="teacher-class-code"
            value={classCode}
            onChange={(e) => {
              setClassCode(e.target.value);
              setError('');
            }}
            className="w-full mb-4 text-foreground bg-background px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow min-h-[48px]"
            placeholder={tx('ui:s_c7ea158fdd')}
            required
            disabled={loading}
            autoComplete="off"
            autoCapitalize="none"
          />

          <label htmlFor="teacher-pin" className="block mb-2 font-medium">{tx('ui:s_d4573570bc')}</label>
          <input
            id="teacher-pin"
            value={teacherPin}
            onChange={(e) => {
              setTeacherPin(e.target.value);
              setError('');
            }}
            className="w-full mb-4 text-foreground bg-background px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow min-h-[48px] tracking-widest"
            placeholder={tx('ui:s_4c31863a47')}
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
