import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkClassExists, createClass } from '@/lib/classroom';
import AuthNavButton from '@/components/AuthNavButton';

const TeacherRegisterPage: React.FC = () => {
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = classCode.trim();
    if (!code) return;

    const exists = await checkClassExists(code);
    if (exists) {
      setError(`Class code "${code}" is already taken by another teacher. Please choose a different one.`);
      return;
    }

    try {
      await createClass(code);
      localStorage.setItem('better-math:active-teacher', JSON.stringify({ classCode: code }));
      navigate(`/teacher/${code}`);
    } catch (err: any) {
      console.error(err);
      setError("Failed to create class: " + (err.message || "Check your database connection."));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-card p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-2">Teacher Registration</h2>
        <p className="text-muted-foreground mb-6">Create a unique code for your classroom.</p>
        
        <form onSubmit={handleRegister}>
          <label className="block mb-2 font-medium">New Class Code</label>
          <input 
            value={classCode} 
            onChange={e => { setClassCode(e.target.value); setError(''); }} 
            className="input w-full mb-4 text-black px-4 py-2 border rounded" 
            placeholder="e.g., MATH101"
            required
          />
          
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
          
          <div className="flex gap-3 justify-end mt-4">
            <AuthNavButton onClick={() => navigate('/')} label="Cancel" />
            <button type="submit" className="btn btn-primary bg-sky-600 text-white px-4 py-2 rounded">Create Class</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherRegisterPage;
