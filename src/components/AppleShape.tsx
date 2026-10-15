import React from 'react';

/** Shared apple drawing used by supply buttons and the basket SVG. */
export const AppleShape: React.FC<{ className?: string }> = ({ className = '' }) => (
  <g className={className}>
    <ellipse cx="12" cy="14" rx="8" ry="9" fill="hsl(var(--apple))" />
    <ellipse cx="9.5" cy="11" rx="3.2" ry="4" fill="hsl(var(--apple) / 0.45)" />
    <ellipse cx="12" cy="14" rx="8" ry="9" fill="none" stroke="hsl(var(--apple) / 0.55)" strokeWidth="1.2" />
    <path
      d="M12 5C12 5 13.2 2.2 15.2 2"
      stroke="hsl(var(--basket))"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
    <ellipse cx="14.5" cy="3.8" rx="2.2" ry="1.2" fill="hsl(var(--success))" transform="rotate(-20 14.5 3.8)" />
  </g>
);

export default AppleShape;
