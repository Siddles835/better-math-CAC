import { tx } from '@/i18n/tx';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import ObjectGlyph from '@/components/objects/ObjectGlyph';
import { speak, stopSpeaking } from '@/lib/speech';
import { useAccessibility } from '@/context/AccessibilityContext';
import { cn } from '@/lib/utils';
import {
  clampCount,
  computeGroupTotal,
  type GroupOp,
} from './groupAnimationMath';

export type { GroupOp };

export interface GroupAnimationProps {
  op: GroupOp;
  a: number;
  b?: number;
  /** Built-in glyph id or 'dot'. */
  glyph?: string;
  autoplay?: boolean;
  onDone?: () => void;
  className?: string;
}

type Phase =
  | 'idle'
  | 'show-a'
  | 'show-b'
  | 'operator'
  | 'merge'
  | 'result'
  | 'done';

const Dot: React.FC<{ lit?: boolean; leaving?: boolean; reduceMotion: boolean }> = ({
  lit,
  leaving,
  reduceMotion,
}) => (
  <span
    className={cn(
      'inline-flex h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-foreground/70 bg-primary/80',
      !reduceMotion && lit && 'animate-fade-in',
      leaving && 'opacity-30 scale-75'
    )}
    aria-hidden
  />
);

/**
 * Reusable dots / stickers animation for count, add, subtract, multiply, divide.
 * Numerals stay LTR. Respects prefers-reduced-motion via Accessibility prefs.
 */
const GroupAnimation: React.FC<GroupAnimationProps> = ({
  op,
  a: rawA,
  b: rawB = 0,
  glyph = 'dot',
  autoplay = true,
  onDone,
  className,
}) => {
  const { prefs } = useAccessibility();
  const reduceMotion = prefs.reduceMotion || prefs.calmBackground;
  const a = clampCount(rawA);
  const b = clampCount(rawB);
  const total = computeGroupTotal(op, a, b);

  const phases: Phase[] = useMemo(() => {
    if (op === 'count') return ['show-a', 'result', 'done'];
    if (op === 'subtract') return ['show-a', 'show-b', 'merge', 'result', 'done'];
    if (op === 'multiply' || op === 'divide') return ['show-a', 'show-b', 'merge', 'result', 'done'];
    return ['show-a', 'show-b', 'operator', 'merge', 'result', 'done'];
  }, [op]);

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [visibleA, setVisibleA] = useState(reduceMotion ? a : 0);
  const [visibleB, setVisibleB] = useState(reduceMotion ? b : 0);
  const [visibleResult, setVisibleResult] = useState(reduceMotion ? total : 0);
  const timer = useRef<number | null>(null);

  const phase = phases[Math.min(phaseIndex, phases.length - 1)] ?? 'done';

  const clearTimer = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const narrate = useCallback(
    (text: string) => {
      if (prefs.muteSounds || !prefs.voiceEnabled) return;
      void speak(text);
    },
    [prefs.muteSounds, prefs.voiceEnabled]
  );

  const stepForward = useCallback(() => {
    setPhaseIndex((index) => Math.min(index + 1, phases.length - 1));
  }, [phases.length]);

  const stepBack = useCallback(() => {
    setPhaseIndex((index) => Math.max(index - 1, 0));
  }, []);

  const replay = useCallback(() => {
    stopSpeaking();
    clearTimer();
    setPhaseIndex(0);
    setVisibleA(reduceMotion ? a : 0);
    setVisibleB(reduceMotion ? b : 0);
    setVisibleResult(reduceMotion ? total : 0);
    setPlaying(true);
  }, [a, b, reduceMotion, total]);

  useEffect(() => {
    if (!playing) return;
    clearTimer();

    if (phase === 'show-a') {
      if (reduceMotion) {
        setVisibleA(a);
        narrate(tx('paths:anim_count_a', { n: a }));
        timer.current = window.setTimeout(stepForward, 700);
        return;
      }
      if (visibleA < a) {
        timer.current = window.setTimeout(() => setVisibleA((n) => n + 1), 180);
      } else {
        narrate(tx('paths:anim_count_a', { n: a }));
        timer.current = window.setTimeout(stepForward, 500);
      }
      return;
    }

    if (phase === 'show-b') {
      if (reduceMotion) {
        setVisibleB(b);
        timer.current = window.setTimeout(stepForward, 700);
        return;
      }
      if (visibleB < b) {
        timer.current = window.setTimeout(() => setVisibleB((n) => n + 1), 180);
      } else {
        timer.current = window.setTimeout(stepForward, 400);
      }
      return;
    }

    if (phase === 'operator' || phase === 'merge') {
      const line =
        op === 'add'
          ? tx('paths:anim_add', { a, b, total })
          : op === 'subtract'
            ? tx('paths:anim_sub', { a, b, total })
            : op === 'multiply'
              ? tx('paths:anim_mul', { a, b, total })
              : op === 'divide'
                ? tx('paths:anim_div', { a, b, total })
                : tx('paths:anim_count_a', { n: a });
      if (phase === 'merge') narrate(line);
      timer.current = window.setTimeout(stepForward, reduceMotion ? 600 : 900);
      return;
    }

    if (phase === 'result') {
      if (reduceMotion) {
        setVisibleResult(total);
        timer.current = window.setTimeout(stepForward, 700);
        return;
      }
      if (visibleResult < total) {
        timer.current = window.setTimeout(() => setVisibleResult((n) => n + 1), 160);
      } else {
        timer.current = window.setTimeout(stepForward, 500);
      }
      return;
    }

    if (phase === 'done') {
      setPlaying(false);
      onDone?.();
    }

    return clearTimer;
  }, [
    a,
    b,
    narrate,
    onDone,
    op,
    phase,
    playing,
    reduceMotion,
    stepForward,
    total,
    visibleA,
    visibleB,
    visibleResult,
  ]);

  useEffect(() => () => clearTimer(), []);

  const renderGlyphs = (count: number, leavingCount = 0) => {
    const items = Array.from({ length: count }, (_, index) => {
      const leaving = index >= count - leavingCount && leavingCount > 0;
      if (glyph === 'dot') {
        return <Dot key={index} lit reduceMotion={reduceMotion} leaving={leaving} />;
      }
      return (
        <ObjectGlyph
          key={index}
          objectId={glyph}
          size="sm"
          className={cn(leaving && 'opacity-30')}
        />
      );
    });
    return <div className="flex flex-wrap gap-1.5 justify-center max-w-[14rem]">{items}</div>;
  };

  const leaving = op === 'subtract' && (phase === 'merge' || phase === 'result') ? b : 0;
  const showB = op !== 'count' && phase !== 'show-a' && phase !== 'idle';
  const showResult = phase === 'result' || phase === 'done' || phase === 'merge';

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card/80 p-4 sm:p-5',
        className
      )}
      role="region"
      aria-label={tx('paths:anim_label')}
    >
      <div className="flex flex-col items-center gap-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="rounded-2xl border border-dashed border-border px-3 py-3 min-h-[72px] min-w-[72px] flex items-center justify-center">
            {renderGlyphs(visibleA, leaving)}
          </div>
          {showB && (
            <>
              <span className="text-2xl font-semibold" dir="ltr" aria-hidden>
                {op === 'add' ? '+' : op === 'subtract' ? '−' : op === 'multiply' ? '×' : '÷'}
              </span>
              <div className="rounded-2xl border border-dashed border-border px-3 py-3 min-h-[72px] min-w-[72px] flex items-center justify-center">
                {op === 'subtract' ? (
                  <span className="text-xl font-semibold" dir="ltr">
                    {visibleB}
                  </span>
                ) : (
                  renderGlyphs(visibleB)
                )}
              </div>
            </>
          )}
          {showResult && (
            <>
              <span className="text-2xl font-semibold" dir="ltr" aria-hidden>
                =
              </span>
              <div className="rounded-2xl border border-primary/40 bg-primary/10 px-3 py-3 min-h-[72px] min-w-[72px] flex flex-col items-center justify-center gap-2">
                {op === 'count' || op === 'add' || op === 'multiply'
                  ? renderGlyphs(visibleResult)
                  : null}
                <span className="text-2xl font-semibold" dir="ltr">
                  {visibleResult}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-[48px]"
          onClick={() => setPlaying((value) => !value)}
        >
          {playing ? tx('paths:anim_pause') : tx('paths:anim_play')}
        </Button>
        <Button type="button" variant="outline" className="min-h-[48px]" onClick={replay}>
          {tx('paths:anim_replay')}
        </Button>
        <Button type="button" variant="ghost" className="min-h-[48px]" onClick={stepBack}>
          {tx('paths:anim_back')}
        </Button>
        <Button type="button" variant="ghost" className="min-h-[48px]" onClick={stepForward}>
          {tx('paths:anim_next')}
        </Button>
      </div>
    </div>
  );
};

export default GroupAnimation;
