import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrGetClass } from '@/lib/classroom';

const TeacherLoginPage: React.FC = () => {
  const [classCode, setClassCode] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!classCode) return;
    const cls = createOrGetClass(classCode.trim(), teacherCode || undefined);
    // store active teacher locally
    localStorage.setItem('better-math:active-teacher', JSON.stringify({ classCode: cls.classCode, teacherCode: cls.teacherCode }));
    navigate(`/teacher/${cls.classCode}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-card p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Teacher Login</h2>
        <label className="block mb-2">Class Code</label>
        <input value={classCode} onChange={e => setClassCode(e.target.value)} className="input w-full mb-4" />
        <label className="block mb-2">(Optional) Teacher Join Code</label>
        <input value={teacherCode} onChange={e => setTeacherCode(e.target.value)} className="input w-full mb-4" />
        <div className="flex gap-3 justify-end">
          <button onClick={() => navigate('/')} className="btn">Back</button>
          <button onClick={handleJoin} className="btn btn-primary">Enter Dashboard</button>
        </div>
      </div>
    </div>
  );
};

export default TeacherLoginPage;
