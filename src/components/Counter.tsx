import React, { useEffect, useRef } from 'react';
import { speak } from '@/lib/speech';

interface CounterProps {
  count: number;
  label?: string;
  className?: string;
}

const Counter: React.FC<CounterProps> = ({ count, label, className = '' }) => {
  const prevCount = useRef(count);

  useEffect(() => {
    // Only speak when the count changes from a user action (not initial mount at 0).
    if (count > 0 && count !== prevCount.current) {
      speak(String(count));
    }
    prevCount.current = count;
  }, [count]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {label && (
        <span className="text-sm text-muted-foreground mb-1">{label}</span>
      )}
      <div className="bg-card border border-border rounded-xl px-6 py-3 min-w-[80px] text-center">
        <span className="text-3xl font-semibold text-foreground animate-count-pop" key={count}>
          {count}
        </span>
      </div>
    </div>
  );
};

export default Counter;
