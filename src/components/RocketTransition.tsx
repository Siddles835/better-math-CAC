import React, { useEffect, useState } from 'react';
import { useGame } from '@/context/GameContext';

const RocketTransition: React.FC = () => {
  const { showRocketTransition, setShowRocketTransition } = useGame();
  const [stars, setStars] = useState<{ x: number; y: number; size: number; delay: number }[]>([]);

  useEffect(() => {
    // Generate random stars for the space background
    const generatedStars = Array.from({ length: 60 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 2,
    }));
    setStars(generatedStars);
  }, []);

  useEffect(() => {
    if (showRocketTransition) {
      const timer = setTimeout(() => {
        setShowRocketTransition(false);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [showRocketTransition, setShowRocketTransition]);

  if (!showRocketTransition) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{
      background: 'linear-gradient(135deg, hsl(230 30% 8%) 0%, hsl(240 25% 12%) 40%, hsl(260 20% 15%) 100%)'
    }}>
      {/* Stars */}
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: `hsl(45 70% ${60 + Math.random() * 30}%)`,
            animation: `twinkle ${3 + star.delay}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
      
      {/* Streaking stars effect */}
      <div className="absolute inset-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`streak-${i}`}
            className="absolute h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{
              top: `${10 + i * 7}%`,
              left: '-100%',
              width: '80px',
              animation: `star-drift 3s linear infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* Rocket - Much larger, smooth movement */}
      <div 
        className="animate-rocket-fly absolute"
        style={{ top: '40%', transform: 'translateY(-50%)' }}
      >
        <svg
          width="400"
          height="260"
          viewBox="0 0 100 60"
          fill="none"
        >
          {/* Rocket flame - animated glow */}
          <ellipse cx="8" cy="30" rx="14" ry="10" fill="hsl(30 80% 55%)" opacity="0.6" />
          <ellipse cx="5" cy="30" rx="10" ry="7" fill="hsl(40 90% 65%)" opacity="0.7" />
          <ellipse cx="3" cy="30" rx="6" ry="4" fill="hsl(50 95% 75%)" opacity="0.9" />
          
          {/* Rocket body */}
          <ellipse cx="50" cy="30" rx="35" ry="14" fill="hsl(var(--rocket))" />
          
          {/* Rocket nose */}
          <path
            d="M85 30 L100 30 Q95 20 85 16 L85 30 Q95 20 85 44 L100 30"
            fill="hsl(0 50% 55%)"
          />
          <path
            d="M85 16 Q95 20 100 30 Q95 40 85 44"
            fill="hsl(0 55% 60%)"
          />
          
          {/* Window */}
          <circle cx="60" cy="30" r="8" fill="hsl(200 60% 80%)" />
          <circle cx="60" cy="30" r="5" fill="hsl(200 70% 90%)" />
          
          {/* Fins */}
          <path d="M20 16 L30 5 L35 16" fill="hsl(0 50% 50%)" />
          <path d="M20 44 L30 55 L35 44" fill="hsl(0 50% 50%)" />
          
          {/* Body stripe */}
          <rect x="40" y="26" width="20" height="8" rx="2" fill="hsl(var(--rocket))" opacity="0.5" />
        </svg>
      </div>

    </div>
  );
};

export default RocketTransition;
