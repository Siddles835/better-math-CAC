import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  applyClassStartIfNeeded,
  findStudentKey,
  getClass,
  normalizeLabel,
  resolveClassCode,
  updateStudentState,
} from '@/lib/classroom';
import { getClassroomUnlockPlanet } from '@/lib/planets';
import { getLastClassCode, setActiveStudent } from '@/lib/session';
import { useGame } from '@/context/GameContext';
import AuthNavButton from '@/components/AuthNavButton';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';

type LoginLocationState = { classCode?: string; nickname?: string };

const StudentLoginPage: React.FC = () => {
  const location = useLocation();
  const preset = (location.state as LoginLocationState | null) ?? null;
  const [classCode, setClassCode] = useState(preset?.classCode ?? getLastClassCode());
  const [nickname, setNickname] = useState(preset?.nickname ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { hydrateFromStudent, hydrateClassMax } = useGame();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeLabel(classCode);
    const name = normalizeLabel(nickname);
    if (!code || !name || loading) return;

    setLoading(true);
    setError('');

    try {
      const resolved = await resolveClassCode(code);
      if (!resolved) {
        setError(`Class code "${code}" does not exist.`);
        return;
      }

      const cls = await getClass(resolved);
      const key = findStudentKey(cls?.students, name);
      const student = key ? cls?.students?.[key] : null;

      if (!key || !student) {
        setError(
          `We couldn't find "${name}" in this class. Check the spelling of your space name, or go back and Join Class as a new student.`
        );
        return;
      }

      const unlock = getClassroomUnlockPlanet(cls);
      const adjusted = applyClassStartIfNeeded(student, cls);
      if (
        adjusted.planet !== student.planet ||
        (adjusted.completedPlanets?.length ?? 0) !== (student.completedPlanets?.length ?? 0)
      ) {
        await updateStudentState(resolved, adjusted, key);
      }

      if (unlock) hydrateClassMax(unlock);
      hydrateFromStudent(adjusted);
      setActiveStudent({
        classCode: resolved,
        nickname: key,
        displayName: adjusted.nickname || name,
      });

      navigate(STUDENT_HUB_PATH, { replace: true });
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
        <h2 className="text-2xl font-semibold mb-2">Student Login</h2>
        <p className="text-muted-foreground mb-6">
          Welcome back! Enter the same class code and space name you used when you joined — works
          on any device. Ask your teacher if you forget the name; they can see it on the class roster.
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
            placeholder="Class Code"
            required
            disabled={loading}
            autoComplete="off"
            autoCapitalize="none"
          />

          <label className="block mb-2 font-medium">Your Space Name</label>
          <input
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setError('');
            }}
            className="w-full mb-4 text-foreground bg-background px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow min-h-[48px]"
            placeholder="The generated name you joined with"
            required
            disabled={loading}
            autoComplete="username"
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
              className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-emerald-500 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none min-h-[48px]"
            >
              {loading ? 'Loading…' : 'Resume Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentLoginPage;
