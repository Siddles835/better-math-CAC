import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkClassExists, checkStudentExists, registerStudent, getClass } from '@/lib/classroom';
import { setActiveStudent } from '@/lib/session';
import { useGame } from '@/context/GameContext';
import AuthNavButton from '@/components/AuthNavButton';

const StudentRegisterPage: React.FC = () => {
  const [classCode, setClassCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { hydrateFromStudent, hydrateClassMax } = useGame();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = classCode.trim();
    const name = nickname.trim();
    if (!code || !name) return;

    const classExists = await checkClassExists(code);
    if (!classExists) {
      setError(`Class code "${code}" does not exist. Please ask your teacher for the correct code.`);
      return;
    }

    const studentExists = await checkStudentExists(code, name);
    if (studentExists) {
      setError(`The name "${name}" is already taken in this class. Please choose a different nickname.`);
      return;
    }

    try {
      const student = await registerStudent(code, name);
      if (!student) {
        setError('Failed to register. Please try again.');
        return;
      }
      const cls = await getClass(code);
      hydrateClassMax(cls?.defaultStart?.planet);
      hydrateFromStudent(student);
      setActiveStudent({ classCode: code, nickname: name });
      navigate('/planet-select');
    } catch (err: any) {
      console.error(err);
      setError("Failed to register: " + (err.message || "Check your database connection."));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-card p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-2">Student Registration</h2>
        <p className="text-muted-foreground mb-6">Join your teacher's class to start learning!</p>

        <form onSubmit={handleRegister}>
          <label className="block mb-2 font-medium">Class Code</label>
          <input 
            value={classCode} 
            onChange={e => { setClassCode(e.target.value); setError(''); }} 
            className="input w-full mb-4 text-black px-4 py-2 border rounded" 
            placeholder="Ask your teacher for this"
            required
          />

          <label className="block mb-2 font-medium">Your Nickname</label>
          <input 
            value={nickname} 
            onChange={e => { setNickname(e.target.value); setError(''); }} 
            className="input w-full mb-4 text-black px-4 py-2 border rounded" 
            placeholder="Type your name"
            required
          />

          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

          <div className="flex gap-3 justify-end mt-4">
            <AuthNavButton onClick={() => navigate('/')} />
            <button type="submit" className="btn btn-primary bg-emerald-600 text-white px-4 py-2 rounded">Join Class</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentRegisterPage;
