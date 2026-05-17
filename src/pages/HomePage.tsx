import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

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
          Choose your role to get started or resume your progress.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 w-full max-w-2xl">
        {/* Student Section */}
        <div className="flex flex-col gap-4 p-6 bg-card rounded-2xl shadow-md border border-gray-100">
          <h2 className="text-2xl font-semibold text-center mb-2">Students</h2>
          <button
            onClick={() => navigate('/student-register')}
            className="w-full px-6 py-3 text-lg font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-sm"
          >
            New Student (Register)
          </button>
          <button
            onClick={() => navigate('/student-login')}
            className="w-full px-6 py-3 text-lg font-semibold rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-all shadow-sm"
          >
            Returning Student (Login)
          </button>
        </div>

        {/* Teacher Section */}
        <div className="flex flex-col gap-4 p-6 bg-card rounded-2xl shadow-md border border-gray-100">
          <h2 className="text-2xl font-semibold text-center mb-2">Teachers</h2>
          <button
            onClick={() => navigate('/teacher-register')}
            className="w-full px-6 py-3 text-lg font-semibold rounded-xl bg-sky-600 text-white hover:bg-sky-500 transition-all shadow-sm"
          >
            Create Class (Register)
          </button>
          <button
            onClick={() => navigate('/teacher-login')}
            className="w-full px-6 py-3 text-lg font-semibold rounded-xl bg-sky-100 text-sky-800 hover:bg-sky-200 transition-all shadow-sm"
          >
            Manage Class (Login)
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
