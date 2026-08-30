import React from 'react';

interface BasketProps {
  count?: number;
  children?: React.ReactNode;
  className?: string;
}

const Basket: React.FC<BasketProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative w-full max-w-[220px] sm:max-w-[300px] md:max-w-[380px] mx-auto ${className}`}>
      <svg viewBox="0 0 400 280" fill="none" className="w-full h-auto">
        <path
          d="M40 90 L80 250 L320 250 L360 90 Z"
          fill="hsl(var(--basket))"
          stroke="hsl(25 55% 35%)"
          strokeWidth="3"
        />
        <path d="M70 130 L330 130" stroke="hsl(25 55% 35%)" strokeWidth="2" opacity="0.5" />
        <path d="M65 170 L335 170" stroke="hsl(25 55% 35%)" strokeWidth="2" opacity="0.5" />
        <path d="M60 210 L340 210" stroke="hsl(25 55% 35%)" strokeWidth="2" opacity="0.5" />
        <path d="M130 90 L110 250" stroke="hsl(25 55% 35%)" strokeWidth="1.5" opacity="0.3" />
        <path d="M200 90 L200 250" stroke="hsl(25 55% 35%)" strokeWidth="1.5" opacity="0.3" />
        <path d="M270 90 L290 250" stroke="hsl(25 55% 35%)" strokeWidth="1.5" opacity="0.3" />
        <ellipse cx="200" cy="90" rx="165" ry="35" fill="hsl(25 50% 40%)" />
        <ellipse cx="200" cy="95" rx="150" ry="28" fill="hsl(230 25% 10%)" />
      </svg>
      {/* Contained 3-column grid so up to 9 apples always stay INSIDE the basket
          (they used to wrap into a tall stack on phones and cover the Check button). */}
      <div className="absolute top-[24%] left-1/2 -translate-x-1/2 w-[62%] max-h-[68%] grid grid-cols-3 gap-1 sm:gap-2 place-items-center content-start overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default Basket;
