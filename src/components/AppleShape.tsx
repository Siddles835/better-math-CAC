import React from 'react';

/** Shared apple drawing used by supply buttons and the basket SVG. */
export const AppleShape: React.FC<{ className?: string }> = ({ className = '' }) => (
  <g className={className}>
    <ellipse cx="12" cy="14" rx="7.5" ry="8.5" fill="hsl(var(--apple))" />
    <ellipse cx="9.2" cy="11" rx="2.8" ry="3.5" fill="hsl(var(--background) / 0.35)" />
    <ellipse
      cx="12"
      cy="14"
      rx="7.5"
      ry="8.5"
      fill="none"
      stroke="hsl(var(--foreground) / 0.2)"
      strokeWidth="1"
    />
    <path
      d="M12 5.5C12 5.5 13.1 2.8 14.8 2.2"
      stroke="hsl(var(--basket))"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
    <ellipse cx="14.2" cy="3.6" rx="2" ry="1.1" fill="hsl(var(--success))" transform="rotate(-18 14.2 3.6)" />
  </g>
);

export default AppleShape;
