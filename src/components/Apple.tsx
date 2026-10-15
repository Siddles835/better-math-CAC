import { tx } from '@/i18n/tx';
import React from 'react';
import { AppleShape } from '@/components/AppleShape';
import { hapticTap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface AppleProps {
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const Apple: React.FC<AppleProps> = ({ onClick, className = '', size = 'md', label }) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
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
      disabled={!onClick}
      className={cn(
        'inline-flex items-center justify-center min-h-[48px] min-w-[48px] rounded-xl transition-transform duration-200',
        onClick && 'hover:scale-110 active:scale-95 cursor-pointer',
        !onClick && 'pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
      aria-label={label ?? tx('ui:s_476432a3e8')}
    >
      <svg viewBox="0 0 24 24" fill="none" className={cn(sizeClasses[size], 'max-w-full max-h-full')}>
        <AppleShape />
      </svg>
    </button>
  );
};

export default Apple;
