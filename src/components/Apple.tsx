import React from 'react';

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

  return (
    <button
      onClick={onClick}
      className={`${sizeClasses[size]} transition-transform hover:scale-110 cursor-pointer ${className}`}
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
