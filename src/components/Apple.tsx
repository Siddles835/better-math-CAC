import React from 'react';
import { hapticTap } from '@/lib/haptics';

interface AppleProps {
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Apple: React.FC<AppleProps> = ({ onClick, className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
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
      aria-label="Apple"
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <ellipse cx="12" cy="14" rx="8" ry="9" fill="hsl(var(--apple))" />
        <path
          d="M12 5C12 5 13 2 15 2"
          stroke="hsl(var(--basket))"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="14" cy="4" rx="2" ry="1" fill="hsl(var(--success))" />
      </svg>
    </button>
  );
};

export default Apple;
