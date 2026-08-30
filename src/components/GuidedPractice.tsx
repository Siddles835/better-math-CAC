import React, { useMemo, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReadAloudButton from '@/components/ReadAloudButton';
import { speak } from '@/lib/speech';
import { hapticTap } from '@/lib/haptics';

interface GuidedPracticeProps {
  lessonType: 'counting' | 'addition' | 'subtraction';
  num1: number;
  num2?: number;
  /** Optional story line so practice matches the word problem. */
  storyHint?: string;
  onClose: () => void;
}

/**
 * Interactive remediation: students manipulate pencils to match the equation.
 * - counting: fill empty outlines while counting
 * - addition: set up first group, then add the second group
 * - subtraction: start with the full group, tap to take some away
 */
const GuidedPractice: React.FC<GuidedPracticeProps> = ({
  lessonType,
  num1,
  num2 = 0,
  storyHint,
  onClose,
}) => {
  const [phase, setPhase] = useState<'first' | 'second'>(
    lessonType === 'addition' ? 'first' : 'second'
  );
  const [firstFilled, setFirstFilled] = useState(0);
  const [secondFilled, setSecondFilled] = useState(0);
  const [crossed, setCrossed] = useState<boolean[]>(Array(num1).fill(false));

  const crossedCount = crossed.filter(Boolean).length;

  const instruction = useMemo(() => {
    if (lessonType === 'counting') {
      return `Let's count together! Tap each empty pencil to fill it. We need ${num1}.`;
    }
    if (lessonType === 'addition') {
      if (phase === 'first') {
        return `Set up the equation. First tap to show ${num1} pencil${num1 === 1 ? '' : 's'}.`;
      }
      return `Great! Now tap to add ${num2} more pencil${num2 === 1 ? '' : 's'} to match ${num1} + ${num2}.`;
    }
    return `Set up the equation ${num1} − ${num2}. Tap ${num2} pencil${num2 === 1 ? '' : 's'} to take away.`;
  }, [lessonType, num1, num2, phase]);

  const isDone =
    lessonType === 'counting'
      ? secondFilled === num1
      : lessonType === 'addition'
        ? phase === 'second' && secondFilled === num2
        : crossedCount === num2;

  const fillNext = (group: 'first' | 'second', max: number) => {
    if (group === 'first' && firstFilled < max) {
      const next = firstFilled + 1;
      hapticTap();
      setFirstFilled(next);
      speak(String(next));
      if (next >= max && lessonType === 'addition') {
        setTimeout(() => setPhase('second'), 350);
      }
    }
    if (group === 'second' && secondFilled < max) {
      const next = secondFilled + 1;
      hapticTap();
      setSecondFilled(next);
      speak(String(lessonType === 'counting' ? next : num1 + next));
    }
  };

  const crossPencil = (index: number) => {
    if (crossed[index] || crossedCount >= num2) return;
    hapticTap();
    setCrossed((prev) => prev.map((c, i) => (i === index ? true : c)));
    speak(String(crossedCount + 1));
  };

  const emptySlot = (
    key: string | number,
    onClick: () => void,
    filled: boolean,
    colorClass: string
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      disabled={filled}
      aria-label={filled ? 'Filled pencil' : 'Empty pencil — tap to fill'}
      className={`w-12 h-12 min-h-[48px] min-w-[48px] rounded-xl flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        filled
          ? 'bg-primary/10 scale-100'
          : 'border-2 border-dashed border-muted-foreground/50 hover:border-primary hover:scale-110 active:scale-95 cursor-pointer'
      }`}
    >
      <Pencil className={`w-8 h-8 ${filled ? colorClass : 'text-muted-foreground/30'}`} />
    </button>
  );

  return (
    <div className="fixed inset-0 bg-background/90 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card rounded-2xl p-6 md:p-8 border border-border max-w-lg w-full text-center relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-10 h-10 min-h-[44px] min-w-[44px] rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {storyHint && (
          <p className="text-sm text-muted-foreground mb-3 pr-10 text-left">{storyHint}</p>
        )}

        <div className="flex items-start justify-center gap-3 mb-6">
          <p className="text-lg font-semibold text-foreground text-left flex-1">{instruction}</p>
          <ReadAloudButton text={instruction} className="shrink-0" />
        </div>

        {lessonType === 'counting' && (
          <>
            <div className="flex gap-3 flex-wrap justify-center mb-6">
              {Array.from({ length: num1 }).map((_, i) =>
                emptySlot(
                  i,
                  () => fillNext('second', num1),
                  i < secondFilled,
                  'text-primary'
                )
              )}
            </div>
            <p className="text-3xl font-bold text-primary mb-6" aria-live="polite">
              {secondFilled} {secondFilled === 1 ? 'pencil' : 'pencils'}
            </p>
          </>
        )}

        {lessonType === 'addition' && (
          <>
            <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
              <div className="flex gap-2 flex-wrap justify-center">
                {Array.from({ length: num1 }).map((_, i) =>
                  emptySlot(
                    `a-${i}`,
                    () => phase === 'first' && fillNext('first', num1),
                    i < firstFilled,
                    'text-primary'
                  )
                )}
              </div>
              <span className="text-2xl font-bold text-primary">+</span>
              <div className="flex gap-2 flex-wrap justify-center">
                {Array.from({ length: num2 }).map((_, i) =>
                  emptySlot(
                    `b-${i}`,
                    () => phase === 'second' && fillNext('second', num2),
                    i < secondFilled,
                    'text-accent'
                  )
                )}
              </div>
            </div>
            <p className="text-3xl font-bold text-primary mb-6" aria-live="polite">
              {firstFilled} + {secondFilled}
              {isDone ? ` = ${num1 + num2}` : ''}
            </p>
          </>
        )}

        {lessonType === 'subtraction' && (
          <>
            <div className="flex gap-3 flex-wrap justify-center mb-6">
              {crossed.map((isCrossed, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => crossPencil(i)}
                  disabled={isCrossed || crossedCount >= num2}
                  aria-label={isCrossed ? 'Taken away' : 'Tap to take away'}
                  className={`relative w-12 h-12 min-h-[48px] min-w-[48px] rounded-xl flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isCrossed
                      ? 'opacity-40 scale-90'
                      : crossedCount >= num2
                        ? ''
                        : 'hover:bg-destructive/10 hover:scale-110 active:scale-95 cursor-pointer'
                  }`}
                >
                  <Pencil
                    className={`w-8 h-8 ${isCrossed ? 'text-muted-foreground' : 'text-primary'}`}
                  />
                  {isCrossed && (
                    <span className="absolute inset-0 flex items-center justify-center text-destructive text-3xl font-bold">
                      ✕
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-3xl font-bold text-primary mb-6" aria-live="polite">
              {crossedCount < num2
                ? `Took away ${crossedCount} of ${num2}`
                : `${num1} − ${num2} = ${num1 - num2}`}
            </p>
          </>
        )}

        {isDone && (
          <div className="animate-fade-in">
            <p className="text-lg font-semibold text-success mb-4 flex items-center justify-center gap-2">
              <Check className="w-6 h-6" />
              You matched the equation! Now try the question again.
            </p>
            <Button type="button" onClick={onClose} size="lg">
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuidedPractice;
