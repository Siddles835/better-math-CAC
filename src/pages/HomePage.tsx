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
          Choose your role to continue: Student or Teacher.
        </p>
      </div>

      <div className="flex gap-6 mt-6">
        <button
          onClick={() => navigate('/student-login')}
          className="px-8 py-4 text-lg font-semibold rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all"
        >
          Student Login
        </button>

        <button
          onClick={() => navigate('/teacher-login')}
          className="px-8 py-4 text-lg font-semibold rounded-2xl bg-sky-600 text-white hover:bg-sky-500 transition-all"
        >
          Teacher Login
        </button>
      </div>
    </div>
  );
};

export default HomePage;
