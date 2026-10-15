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

/** Deterministic pile slots for 0..12 apples. Fills bottom-up, centred. */
const PILE: Array<{ x: number; y: number; rot: number }> = [
  { x: 200, y: 198, rot: -4 },
  { x: 158, y: 196, rot: 6 },
  { x: 242, y: 196, rot: -8 },
  { x: 179, y: 168, rot: 3 },
  { x: 221, y: 168, rot: -5 },
  { x: 200, y: 142, rot: 2 },
  { x: 152, y: 148, rot: -7 },
  { x: 248, y: 148, rot: 8 },
  { x: 179, y: 122, rot: 5 },
  { x: 221, y: 122, rot: -3 },
  { x: 200, y: 100, rot: -2 },
  { x: 164, y: 108, rot: 4 },
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
      const id = window.setTimeout(() => setAnimateIndex(null), 260);
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
      {/* Back rim + dark inside */}
      <ellipse cx="200" cy="88" rx="168" ry="36" fill="hsl(var(--basket) / 0.85)" />
      <ellipse cx="200" cy="96" rx="150" ry="30" fill="hsl(230 25% 10% / 0.55)" />

      {/* Apples sit above the back and below the front wall */}
      {PILE.slice(0, shown).map((slot, index) => {
        const drop = !reduceMotion && animateIndex === index;
        return (
          <g
            key={index}
            transform={`translate(${slot.x - 12} ${slot.y - 14}) rotate(${slot.rot} 12 14) scale(3.1)`}
            className={drop ? 'basket-apple-drop' : undefined}
          >
            <AppleShape />
          </g>
        );
      })}

      {/* Front woven body */}
      <path
        d="M48 100 L78 248 Q200 268 322 248 L352 100"
        fill="hsl(var(--basket))"
        stroke="hsl(var(--basket) / 0.75)"
        strokeWidth="2"
      />
      <path d="M70 140 Q200 152 330 140" stroke="hsl(var(--basket) / 0.45)" strokeWidth="5" fill="none" />
      <path d="M66 176 Q200 188 334 176" stroke="hsl(var(--basket) / 0.4)" strokeWidth="5" fill="none" />
      <path d="M62 212 Q200 224 338 212" stroke="hsl(var(--basket) / 0.35)" strokeWidth="5" fill="none" />
      <path d="M120 104 L108 246" stroke="hsl(var(--basket) / 0.3)" strokeWidth="3" />
      <path d="M200 100 L200 252" stroke="hsl(var(--basket) / 0.28)" strokeWidth="3" />
      <path d="M280 104 L292 246" stroke="hsl(var(--basket) / 0.3)" strokeWidth="3" />

      {/* Front rim over apples */}
      <ellipse cx="200" cy="100" rx="156" ry="22" fill="hsl(var(--basket) / 0.95)" />
      <ellipse cx="200" cy="96" rx="156" ry="12" fill="hsl(var(--basket))" />
      <path
        d="M70 92 Q200 64 330 92"
        stroke="hsl(var(--basket) / 0.7)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />

      {extra > 0 && (
        <g>
          <rect x="300" y="40" width="56" height="32" rx="10" fill="hsl(var(--primary))" />
          <text x="328" y="62" textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize="16" fontWeight="700">
            +{extra}
          </text>
        </g>
      )}
    </svg>
  );

  return (
    <div className={cn('relative w-full max-w-[220px] sm:max-w-[300px] md:max-w-[380px] mx-auto', className)}>
      <style>{`
        @keyframes basket-apple-drop {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .basket-apple-drop {
          animation: basket-apple-drop 200ms ease-out;
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
