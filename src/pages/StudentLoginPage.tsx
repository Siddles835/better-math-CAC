import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkClassExists, checkStudentExists, getClass } from '@/lib/classroom';
import { setActiveStudent } from '@/lib/session';
import { useGame } from '@/context/GameContext';
import AuthNavButton from '@/components/AuthNavButton';

const StudentLoginPage: React.FC = () => {
  const [classCode, setClassCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { hydrateFromStudent, hydrateClassMax } = useGame();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = classCode.trim();
    const name = nickname.trim();
    if (!code || !name) return;

    const classExists = await checkClassExists(code);
    if (!classExists) {
      setError(`Class code "${code}" does not exist.`);
      return;
    }

    const studentExists = await checkStudentExists(code, name);
    if (!studentExists) {
      setError(`We couldn't find the name "${name}" in this class. Check your spelling or go back to Register.`);
      return;
    }

    const cls = await getClass(code);
    const student = cls?.students?.[name];
    if (!student) {
      setError(`We couldn't find the name "${name}" in this class. Check your spelling or go back to Register.`);
      return;
    }

    hydrateClassMax(cls?.defaultStart?.planet);
    hydrateFromStudent(student);
    setActiveStudent({ classCode: code, nickname: name });

    // Always show planet select; tapping a planet resumes its saved step
    navigate('/planet-select');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-card p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-2">Student Login</h2>
        <p className="text-muted-foreground mb-6">Welcome back! Enter your details to resume your journey.</p>

        <form onSubmit={handleLogin}>
          <label className="block mb-2 font-medium">Class Code</label>
          <input 
            value={classCode} 
            onChange={e => { setClassCode(e.target.value); setError(''); }} 
            className="input w-full mb-4 text-black px-4 py-2 border rounded" 
            placeholder="Class Code"
            required
          />

          <label className="block mb-2 font-medium">Your Nickname</label>
          <input 
            value={nickname} 
            onChange={e => { setNickname(e.target.value); setError(''); }} 
            className="input w-full mb-4 text-black px-4 py-2 border rounded" 
            placeholder="The name you registered with"
            required
          />

          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

          <div className="flex gap-3 justify-end mt-4">
            <AuthNavButton onClick={() => navigate('/')} />
            <button type="submit" className="btn btn-primary bg-emerald-600 text-white px-4 py-2 rounded">Resume Game</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentLoginPage;
