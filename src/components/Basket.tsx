import React from 'react';

interface BasketProps {
  count?: number;
  children?: React.ReactNode;
  className?: string;
}

const Basket: React.FC<BasketProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <div className="relative">
        <svg width="400" height="280" viewBox="0 0 400 280" fill="none">
          {/* Basket body - much deeper */}
          <path
            d="M40 90 L80 250 L320 250 L360 90 Z"
            fill="hsl(var(--basket))"
            stroke="hsl(25 55% 35%)"
            strokeWidth="3"
          />
          {/* Basket weave pattern */}
          <path d="M70 130 L330 130" stroke="hsl(25 55% 35%)" strokeWidth="2" opacity="0.5" />
          <path d="M65 170 L335 170" stroke="hsl(25 55% 35%)" strokeWidth="2" opacity="0.5" />
          <path d="M60 210 L340 210" stroke="hsl(25 55% 35%)" strokeWidth="2" opacity="0.5" />
          {/* Vertical weave lines */}
          <path d="M130 90 L110 250" stroke="hsl(25 55% 35%)" strokeWidth="1.5" opacity="0.3" />
          <path d="M200 90 L200 250" stroke="hsl(25 55% 35%)" strokeWidth="1.5" opacity="0.3" />
          <path d="M270 90 L290 250" stroke="hsl(25 55% 35%)" strokeWidth="1.5" opacity="0.3" />
          {/* Basket rim - thicker and more visible */}
          <ellipse cx="200" cy="90" rx="165" ry="35" fill="hsl(25 50% 40%)" />
          {/* Inner dark area - where apples sit */}
          <ellipse cx="200" cy="95" rx="150" ry="28" fill="hsl(230 25% 10%)" />
        </svg>
        {/* Apples positioned deep inside basket interior - in the dark area */}
        <div className="absolute top-[70px] left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-3 max-w-[260px] min-h-[80px] items-end pb-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Basket;
