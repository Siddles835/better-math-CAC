import React from 'react';

interface CounterProps {
  count: number;
  label?: string;
  className?: string;
}

const Counter: React.FC<CounterProps> = ({ count, label, className = '' }) => {
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
