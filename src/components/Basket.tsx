import { tx } from '@/i18n/tx';
import React, { useEffect, useRef, useState } from 'react';
import { AppleShape } from '@/components/AppleShape';
import { useAccessibility } from '@/context/AccessibilityContext';
import { hapticTap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface BasketProps {
  count?: number;
  children?: React.ReactNode;
  className?: string;
  onRemove?: () => void;
}

/**
 * Apple centres. Placed in the open bowl so most of each apple is visible;
 * only the bottom edge tucks under the front rim.
 */
const PILE: Array<{ x: number; y: number; rot: number }> = [
  { x: 200, y: 128, rot: -6 },
  { x: 155, y: 126, rot: 8 },
  { x: 245, y: 126, rot: -10 },
  { x: 178, y: 102, rot: 4 },
  { x: 222, y: 102, rot: -5 },
  { x: 200, y: 82, rot: 2 },
  { x: 148, y: 94, rot: -8 },
  { x: 252, y: 94, rot: 7 },
  { x: 172, y: 68, rot: 5 },
  { x: 228, y: 68, rot: -3 },
  { x: 200, y: 54, rot: -2 },
  { x: 162, y: 58, rot: 3 },
];

const Basket: React.FC<BasketProps> = ({ count, children, className = '', onRemove }) => {
  const { prefs } = useAccessibility();
  const childCount = React.Children.count(children);
  const total = typeof count === 'number' ? count : childCount;
  const shown = Math.min(12, Math.max(0, total));
  const extra = Math.max(0, total - 12);
  const [animateIndex, setAnimateIndex] = useState<number | null>(null);
  const prev = useRef(shown);

  useEffect(() => {
    if (shown > prev.current) {
      setAnimateIndex(shown - 1);
      const id = window.setTimeout(() => setAnimateIndex(null), 220);
      prev.current = shown;
      return () => window.clearTimeout(id);
    }
    prev.current = shown;
    return undefined;
  }, [shown]);

  const reduceMotion = prefs.reduceMotion;
  const label = tx('ui:basketCount', { count: total });

  const svg = (
    <svg
      viewBox="0 0 400 280"
      fill="none"
      className="w-full h-auto pointer-events-none"
      role="img"
      aria-label={label}
    >
      {/* Deep back opening */}
      <ellipse cx="200" cy="58" rx="150" ry="24" fill="hsl(var(--basket) / 0.88)" />
      <path
        d="M55 58 Q55 150 78 230 Q200 255 322 230 Q345 150 345 58"
        fill="hsl(var(--basket) / 0.35)"
      />
      <ellipse cx="200" cy="100" rx="120" ry="40" fill="hsl(var(--foreground) / 0.18)" />

      {/* Apples in the bowl */}
      {PILE.slice(0, shown).map((slot, index) => {
        const drop = !reduceMotion && animateIndex === index;
        return (
          <g
            key={index}
            opacity={drop ? 0.4 : 1}
            transform={`translate(${slot.x - 12} ${slot.y - 14}) rotate(${slot.rot} 12 14) scale(3.15)`}
          >
            <AppleShape />
          </g>
        );
      })}

      {/* Front wall starts low so apple tops stay visible */}
      <path
        d="M60 150 L80 235 Q200 258 320 235 L340 150"
        fill="hsl(var(--basket))"
      />
      <path d="M78 178 Q200 190 322 178" stroke="hsl(var(--basket) / 0.4)" strokeWidth="5" fill="none" />
      <path d="M74 208 Q200 220 326 208" stroke="hsl(var(--basket) / 0.32)" strokeWidth="5" fill="none" />

      {/* Front rim — thin lip over apple bottoms */}
      <ellipse cx="200" cy="148" rx="142" ry="14" fill="hsl(var(--basket))" />
      <path
        d="M70 142 Q200 126 330 142"
        stroke="hsl(var(--basket) / 0.75)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {extra > 0 && (
        <g>
          <rect x="304" y="24" width="52" height="28" rx="10" fill="hsl(var(--primary))" />
          <text
            x="330"
            y="43"
            textAnchor="middle"
            fill="hsl(var(--primary-foreground))"
            fontSize="15"
            fontWeight="700"
          >
            +{extra}
          </text>
        </g>
      )}
    </svg>
  );

  return (
    <div className={cn('relative w-full max-w-[240px] sm:max-w-[300px] md:max-w-[360px] mx-auto', className)}>
      {onRemove ? (
        <button
          type="button"
          className="block w-full min-h-[48px] rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={tx('ui:basketRemoveOne')}
          onClick={() => {
            hapticTap();
            onRemove();
          }}
        >
          {svg}
        </button>
      ) : (
        svg
      )}
    </div>
  );
};

export default Basket;
