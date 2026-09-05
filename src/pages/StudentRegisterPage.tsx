import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dices } from 'lucide-react';
import {
  checkStudentExists,
  registerStudent,
  getClass,
  normalizeLabel,
  nicknameKey,
  resolveClassCode,
} from '@/lib/classroom';
import { getClassroomUnlockPlanet } from '@/lib/planets';
import { getLastClassCode, setActiveStudent } from '@/lib/session';
import { generateUsername } from '@/lib/usernames';
import { hapticTap } from '@/lib/haptics';
import { useGame } from '@/context/GameContext';
import AuthNavButton from '@/components/AuthNavButton';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';

const StudentRegisterPage: React.FC = () => {
  const [classCode, setClassCode] = useState(getLastClassCode());
  // Usernames are always generated on-device (never typed) so MathLift does
  // not collect real student names. Students can re-roll as often as they like.
  const [username, setUsername] = useState(() => generateUsername());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { hydrateFromStudent, hydrateClassMax } = useGame();

  const rollNewUsername = () => {
    hapticTap();
    setUsername(generateUsername());
    setError('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeLabel(classCode);
    let name = normalizeLabel(username);
    if (!code || !name || loading) return;

    setLoading(true);
    setError('');

    try {
      const resolved = await resolveClassCode(code);
      if (!resolved) {
        setError(`Class code "${code}" does not exist. Please ask your teacher for the correct code.`);
        return;
      }

      // Extremely unlikely, but if the generated name is already taken in this
      // class, quietly roll a fresh one until it's free.
      for (let attempt = 0; attempt < 5; attempt++) {
        const taken = await checkStudentExists(resolved, name);
        if (!taken) break;
        name = generateUsername();
      }
      setUsername(name);

      const result = await registerStudent(resolved, name);
      if (!result) {
        setError('Failed to join. Please try again.');
        return;
      }

      const cls = await getClass(result.classCode);
      const unlock = getClassroomUnlockPlanet(cls);
      if (unlock) hydrateClassMax(unlock);
      hydrateFromStudent(result.student);
      setActiveStudent({
        classCode: result.classCode,
        nickname: nicknameKey(name),
        displayName: result.student.nickname,
      });
      navigate(STUDENT_HUB_PATH, { replace: true });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Check your connection.';
      setError('Failed to join: ' + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background subtle-stars flex items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md bg-card/95 p-6 rounded-2xl shadow-lg border border-border animate-fade-in backdrop-blur-sm">
        <h2 className="text-2xl font-semibold mb-2">Join a Class</h2>
        <p className="text-muted-foreground mb-6">
          Enter your teacher&apos;s class code. We&apos;ll give you a fun space name — remember it (or
          write it down) so you can resume on any phone, tablet, or computer.
        </p>

        <form onSubmit={handleRegister}>
          <label className="block mb-2 font-medium">Class Code</label>
          <input
            value={classCode}
            onChange={(e) => {
              setClassCode(e.target.value);
              setError('');
            }}
            className="w-full mb-4 text-foreground bg-background px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow min-h-[48px]"
            placeholder="Ask your teacher for this"
            required
            disabled={loading}
            autoComplete="off"
            autoCapitalize="none"
          />

          <label className="block mb-2 font-medium">Your Space Name</label>
          <div className="flex items-stretch gap-2 mb-2">
            <div
              className="flex-1 flex items-center justify-center px-4 py-3 border border-emerald-500/40 bg-emerald-500/10 rounded-xl min-h-[48px]"
              aria-live="polite"
            >
              <span className="text-xl font-bold tracking-wide text-foreground">{username}</span>
            </div>
            <button
              type="button"
              onClick={rollNewUsername}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-background text-foreground font-semibold hover:bg-muted min-h-[48px] disabled:opacity-60"
              aria-label="Get a new space name"
            >
              <Dices className="w-5 h-5" aria-hidden />
              <span className="hidden sm:inline">New Name</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Don&apos;t like it? Tap the dice for a new one — as many times as you want. We use fun
            made-up names instead of real names to keep you safe.
          </p>

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
              {loading ? 'Joining…' : 'Join Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentRegisterPage;
