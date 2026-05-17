import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [classId, setClassId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const storedClasses = JSON.parse(localStorage.getItem('math_classes') || '[]');

    if (storedClasses.includes(classId)) {
      setErrorMessage(`Error: Class ID "${classId}" is already taken!`);
      return;
    }

    storedClasses.push(classId);
    localStorage.setItem('math_classes', JSON.stringify(storedClasses));

    navigate('/teacher-login');
  };

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col items-center justify-center p-8">
      <div className="animate-fade-in text-center">
        <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-sun/30 flex items-center justify-center animate-gentle-float">
          <div className="w-24 h-24 rounded-full bg-sun/50 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-sun" />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-4">
          Welcome to Better Math
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto mb-8">
          Choose your role to continue: Student or Teacher.
        </p>
      </div>

      <div className="flex flex-col items-center gap-8 mt-6 w-full max-w-md">
        
        <button
          onClick={() => navigate('/student-login')}
          className="w-full px-8 py-4 text-lg font-semibold rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-md hover:shadow-lg"
        >
          Student Login
        </button>

        <div className="w-full h-px bg-gray-300 my-2"></div>

        <form onSubmit={handleTeacherSubmit} className="w-full flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-foreground text-center">
            Teachers: Set your Class ID
          </h2>
          
          <input
            type="text"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            placeholder="Enter Class ID (e.g., 123456)"
            className="px-4 py-3 border-2 border-gray-200 rounded-xl text-lg text-black focus:outline-none focus:border-sky-500 transition-colors"
            required
          />
          
          {errorMessage && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium animate-fade-in text-center">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="w-full px-8 py-4 text-lg font-semibold rounded-2xl bg-sky-600 text-white hover:bg-sky-500 transition-all shadow-md hover:shadow-lg"
          >
            Teacher Login
          </button>
        </form>

      </div>
    </div>
  );
};

export default HomePage;
