import { tx } from '@/i18n/tx';
import React, { useEffect, useRef, useState } from 'react';
import { Minus } from 'lucide-react';
import { AppleShape } from '@/components/AppleShape';
import ObjectGlyph from '@/components/objects/ObjectGlyph';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import { hapticTap } from '@/lib/haptics';
import {
  loadEnabledObjectIds,
  resolveActiveGlyphId,
} from '@/lib/objects/activeGlyph';
import { loadObjectPrefs } from '@/lib/objects/prefs';
import { cn } from '@/lib/utils';

interface BasketProps {
  count?: number;
  children?: React.ReactNode;
  className?: string;
  onRemove?: () => void;
}

/**
 * Distinct pile slots — spaced so each apple is countable, not a red blob.
 * Coordinates are apple centres in the viewBox.
 */
const PILE: Array<{ x: number; y: number; rot: number }> = [
  { x: 200, y: 132, rot: -4 },
  { x: 148, y: 130, rot: 6 },
  { x: 252, y: 130, rot: -7 },
  { x: 174, y: 98, rot: 3 },
  { x: 226, y: 98, rot: -5 },
  { x: 200, y: 70, rot: 2 },
  { x: 140, y: 92, rot: -6 },
  { x: 260, y: 92, rot: 5 },
  { x: 168, y: 58, rot: 4 },
  { x: 232, y: 58, rot: -3 },
  { x: 200, y: 42, rot: -2 },
  { x: 154, y: 48, rot: 3 },
];

const Basket: React.FC<BasketProps> = ({ count, children, className = '', onRemove }) => {
  const { prefs } = useAccessibility();
  const childCount = React.Children.count(children);
  const total = typeof count === 'number' ? count : childCount;
  const shown = Math.min(12, Math.max(0, total));
  const extra = Math.max(0, total - 12);
  const [animateIndex, setAnimateIndex] = useState<number | null>(null);
  const prev = useRef(shown);
  const [glyphIds, setGlyphIds] = useState<string[]>(() =>
    Array.from({ length: 12 }, (_, index) =>
      resolveActiveGlyphId({
        role: 'count',
        activeId: loadObjectPrefs().activeId,
        index,
      })
    )
  );

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const objectPrefs = loadObjectPrefs();
      const enabledIds = await loadEnabledObjectIds();
      if (cancel) return;
      setGlyphIds(
        Array.from({ length: 12 }, (_, index) =>
          resolveActiveGlyphId({
            role: 'count',
            activeId: objectPrefs.activeId,
            enabledIds,
            index,
          })
        )
      );
    })();
    return () => {
      cancel = true;
    };
  }, []);

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
  const canRemove = Boolean(onRemove) && total > 0;
  const useApplePile = glyphIds.every(
    (id) => id === 'builtin:apple' || id === 'apple'
  );

  const basketShell = (
    <>
      {/* Back rim */}
      <ellipse cx="200" cy="48" rx="152" ry="22" fill="hsl(var(--basket))" />
      {/* Inside shadow */}
      <ellipse cx="200" cy="62" rx="130" ry="28" fill="hsl(var(--foreground) / 0.25)" />

      {useApplePile &&
        PILE.slice(0, shown).map((slot, index) => {
          const drop = !reduceMotion && animateIndex === index;
          return (
            <g
              key={index}
              opacity={drop ? 0.45 : 1}
              transform={`translate(${slot.x - 12} ${slot.y - 14}) rotate(${slot.rot} 12 14) scale(2.7)`}
            >
              <AppleShape />
            </g>
          );
        })}

      {/* Front wall — sits under apple centres so each apple stays countable */}
      <path
        d="M52 168 L74 248 Q200 270 326 248 L348 168"
        fill="hsl(var(--basket))"
      />
      <path d="M72 198 Q200 210 328 198" stroke="hsl(var(--basket) / 0.45)" strokeWidth="6" fill="none" />
      <path d="M68 224 Q200 236 332 224" stroke="hsl(var(--basket) / 0.35)" strokeWidth="6" fill="none" />
      <path d="M128 170 L118 245" stroke="hsl(var(--basket) / 0.28)" strokeWidth="3" />
      <path d="M272 170 L282 245" stroke="hsl(var(--basket) / 0.28)" strokeWidth="3" />

      {/* Thin front lip under the apples */}
      <ellipse cx="200" cy="165" rx="148" ry="11" fill="hsl(var(--basket))" />
      <path
        d="M64 160 Q200 148 336 160"
        stroke="hsl(var(--basket) / 0.85)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {extra > 0 && (
        <g>
          <rect x="300" y="20" width="56" height="30" rx="10" fill="hsl(var(--primary))" />
          <text
            x="328"
            y="40"
            textAnchor="middle"
            fill="hsl(var(--primary-foreground))"
            fontSize="15"
            fontWeight="700"
          >
            +{extra}
          </text>
        </g>
      )}
    </>
  );

  const svg = (
    <svg
      viewBox="0 0 400 280"
      fill="none"
      className="w-full h-auto pointer-events-none"
      role="img"
      aria-label={label}
    >
      {basketShell}
    </svg>
  );

  return (
    <div className={cn('relative w-full max-w-[240px] sm:max-w-[300px] md:max-w-[360px] mx-auto', className)}>
      {svg}
      {!useApplePile && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {PILE.slice(0, shown).map((slot, index) => {
            const drop = !reduceMotion && animateIndex === index;
            return (
              <div
                key={index}
                className={cn('absolute', drop && 'opacity-45')}
                style={{
                  left: `${(slot.x / 400) * 100}%`,
                  top: `${(slot.y / 280) * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${slot.rot}deg) scale(0.75)`,
                }}
              >
                <ObjectGlyph
                  objectId={glyphIds[index] ?? 'builtin:apple'}
                  size="sm"
                  className="pointer-events-none min-h-0 min-w-0"
                />
              </div>
            );
          })}
        </div>
      )}
      {onRemove && (
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full min-h-[48px] gap-2"
          disabled={!canRemove}
          aria-label={tx('ui:basketRemoveOne')}
          onClick={() => {
            if (!canRemove) return;
            hapticTap();
            onRemove();
          }}
        >
          <Minus className="h-5 w-5" aria-hidden />
          {tx('ui:basketRemoveOne')}
        </Button>
      )}
    </div>
  );
};

export default Basket;
