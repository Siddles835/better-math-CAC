import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkClassExists } from '@/lib/classroom';
import AuthNavButton from '@/components/AuthNavButton';

const TeacherLoginPage: React.FC = () => {
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = classCode.trim();
    if (!code) return;

    const exists = await checkClassExists(code);
    if (!exists) {
      setError(`Class code "${code}" does not exist. Did you mean to register a new class?`);
      return;
    }

    localStorage.setItem('better-math:active-teacher', JSON.stringify({ classCode: code }));
    navigate(`/teacher/${code}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-card p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-2">Teacher Login</h2>
        <p className="text-muted-foreground mb-6">Enter your existing classroom code to view progress.</p>
        
        <form onSubmit={handleLogin}>
          <label className="block mb-2 font-medium">Existing Class Code</label>
          <input 
            value={classCode} 
            onChange={e => { setClassCode(e.target.value); setError(''); }} 
            className="input w-full mb-4 text-black px-4 py-2 border rounded" 
            placeholder="Enter your class code"
            required
          />
          
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
          
          <div className="flex gap-3 justify-end mt-4">
            <AuthNavButton onClick={() => navigate('/')} />
            <button type="submit" className="btn btn-primary bg-sky-600 text-white px-4 py-2 rounded">Enter Dashboard</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherLoginPage;
