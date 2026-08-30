import React from 'react';
import { hapticTap } from '@/lib/haptics';

interface PencilProps {
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Pencil: React.FC<PencilProps> = ({ onClick, className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-16',
    md: 'w-8 h-20',
    lg: 'w-10 h-24',
  };

  const handleClick = onClick
    ? () => {
        hapticTap();
        onClick();
      }
    : undefined;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${sizeClasses[size]} rounded-lg transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      aria-label="Pencil"
    >
      <svg viewBox="0 0 20 60" fill="none" className="w-full h-full">
        {/* Pencil tip */}
        <polygon points="10,60 5,48 15,48" fill="hsl(var(--foreground))" opacity="0.8" />
        {/* Pencil body */}
        <rect x="5" y="10" width="10" height="38" fill="hsl(var(--pencil))" />
        {/* Pencil stripe */}
        <rect x="5" y="20" width="10" height="4" fill="hsl(var(--background))" opacity="0.3" />
        {/* Eraser */}
        <rect x="5" y="0" width="10" height="10" fill="hsl(var(--apple))" opacity="0.7" />
        {/* Metal band */}
        <rect x="5" y="8" width="10" height="4" fill="hsl(var(--muted-foreground))" />
      </svg>
    </button>
  );
};

export default Pencil;
