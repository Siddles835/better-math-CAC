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
 * Bottom-up pile. Coordinates are apple centres in the basket opening.
 * Kept low so tops sit under the rim and bottoms tuck behind the front wall.
 */
const PILE: Array<{ x: number; y: number; rot: number }> = [
  { x: 200, y: 168, rot: -6 },
  { x: 162, y: 166, rot: 8 },
  { x: 238, y: 166, rot: -10 },
  { x: 182, y: 142, rot: 4 },
  { x: 218, y: 142, rot: -5 },
  { x: 200, y: 122, rot: 2 },
  { x: 155, y: 128, rot: -8 },
  { x: 245, y: 128, rot: 7 },
  { x: 180, y: 108, rot: 5 },
  { x: 220, y: 108, rot: -3 },
  { x: 200, y: 92, rot: -2 },
  { x: 168, y: 96, rot: 3 },
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
      viewBox="0 0 400 260"
      fill="none"
      className="w-full h-auto pointer-events-none"
      role="img"
      aria-label={label}
    >
      {/* Back rim */}
      <ellipse cx="200" cy="78" rx="150" ry="28" fill="hsl(var(--basket) / 0.9)" />
      {/* Dark inside of the bowl */}
      <ellipse cx="200" cy="88" rx="132" ry="24" fill="hsl(var(--foreground) / 0.35)" />

      {/* Apples between back and front */}
      {PILE.slice(0, shown).map((slot, index) => {
        const drop = !reduceMotion && animateIndex === index;
        return (
          <g
            key={index}
            transform={`translate(${slot.x - 12} ${slot.y - 14}) rotate(${slot.rot} 12 14) scale(2.85)`}
            className={drop ? 'basket-apple-drop' : undefined}
          >
            <AppleShape />
          </g>
        );
      })}

      {/* Front wall — covers lower apple halves only */}
      <path
        d="M56 96 L78 220 Q200 242 322 220 L344 96"
        fill="hsl(var(--basket))"
      />
      {/* Soft weave — two bands only */}
      <path d="M74 140 Q200 152 326 140" stroke="hsl(var(--basket) / 0.4)" strokeWidth="6" fill="none" />
      <path d="M70 178 Q200 190 330 178" stroke="hsl(var(--basket) / 0.35)" strokeWidth="6" fill="none" />
      <path d="M140 100 L128 218" stroke="hsl(var(--basket) / 0.25)" strokeWidth="3" />
      <path d="M260 100 L272 218" stroke="hsl(var(--basket) / 0.25)" strokeWidth="3" />

      {/* Front rim sits over the apple bottoms */}
      <ellipse cx="200" cy="96" rx="146" ry="18" fill="hsl(var(--basket))" />
      <path
        d="M70 90 Q200 68 330 90"
        stroke="hsl(var(--basket) / 0.65)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {extra > 0 && (
        <g>
          <rect x="304" y="36" width="52" height="28" rx="10" fill="hsl(var(--primary))" />
          <text
            x="330"
            y="55"
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
      <style>{`
        @keyframes basket-apple-drop {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .basket-apple-drop {
          animation: basket-apple-drop 200ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .basket-apple-drop { animation: none; }
        }
      `}</style>
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
