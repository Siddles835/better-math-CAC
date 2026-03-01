import React from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationArrows from '@/components/NavigationArrows';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col items-center justify-center p-8">
      <div className="animate-fade-in text-center">
        {/* Sun icon */}
        <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-sun/30 flex items-center justify-center animate-gentle-float">
          <div className="w-24 h-24 rounded-full bg-sun/50 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-sun" />
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-4">
          Hello!
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto mb-8">
          Welcome to your math journey through the solar system.
        </p>
      </div>

      <button
        onClick={() => navigate('/solar-system')}
        className="mt-4 px-12 py-5 text-xl font-semibold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-105 animate-fade-in"
      >
        Start Journey 🚀
      </button>
    </div>
  );
};

export default HomePage;
