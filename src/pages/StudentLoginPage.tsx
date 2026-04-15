import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinAsStudent } from '@/lib/classroom';

const StudentLoginPage: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [classCode, setClassCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!nickname || !classCode) return;
    joinAsStudent(classCode.trim(), nickname.trim());
    // store active student locally
    localStorage.setItem('better-math:active', JSON.stringify({ classCode: classCode.trim(), nickname: nickname.trim() }));
    navigate('/planet-select');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-card p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Student Login</h2>
        <label className="block mb-2">Nickname</label>
        <input value={nickname} onChange={e => setNickname(e.target.value)} className="input w-full mb-4" />
        <label className="block mb-2">Class Code</label>
        <input value={classCode} onChange={e => setClassCode(e.target.value)} className="input w-full mb-4" />
        <div className="flex gap-3 justify-end">
          <button onClick={() => navigate('/')} className="btn">Back</button>
          <button onClick={handleJoin} className="btn btn-primary">Join</button>
        </div>
      </div>
    </div>
  );
};

export default StudentLoginPage;
