import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReadAloudButton from '@/components/ReadAloudButton';
import { hapticError, hapticSuccess, hapticTap } from '@/lib/haptics';

interface EquationBuilderProps {
  num1: number;
  num2: number;
  operator: '+' | '−';
  questionText: string;
  onComplete: () => void;
}

type Chip = { id: number; value: number };

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Step 1 for word problems: student builds the equation from the story
 * before solving with manipulatives or answer choices.
 */
const EquationBuilder: React.FC<EquationBuilderProps> = ({
  num1,
  num2,
  operator,
  questionText,
  onComplete,
}) => {
  const chips = useMemo<Chip[]>(() => {
    const values = [num1, num2];
    for (const candidate of [num1 + num2, num1 + 1, num2 + 1, 9, 1, 8, 2]) {
      if (values.length >= 4) break;
      if (candidate >= 0 && candidate <= 12 && !values.includes(candidate)) {
        values.push(candidate);
      }
    }
    return shuffle(values.map((value, id) => ({ id, value })));
  }, [num1, num2]);

  const [slots, setSlots] = useState<(number | null)[]>([null, null]);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const chipValue = (chipId: number | null) =>
    chipId === null ? null : chips.find((c) => c.id === chipId)?.value ?? null;

  const placeChip = (chip: Chip) => {
    if (checked && correct) return;
    if (slots.includes(chip.id)) return;
    const empty = slots.indexOf(null);
    if (empty === -1) return;
    hapticTap();
    setSlots((prev) => prev.map((s, i) => (i === empty ? chip.id : s)));
    setChecked(false);
  };

  const clearSlot = (index: number) => {
    if (checked && correct) return;
    setSlots((prev) => prev.map((s, i) => (i === index ? null : s)));
    setChecked(false);
  };

  const checkEquation = () => {
    const v1 = chipValue(slots[0]);
    const v2 = chipValue(slots[1]);
    if (v1 === null || v2 === null) return;
    const ok =
      operator === '+'
        ? (v1 === num1 && v2 === num2) || (v1 === num2 && v2 === num1)
        : v1 === num1 && v2 === num2;
    setChecked(true);
    setCorrect(ok);
    if (ok) {
      hapticSuccess();
    } else {
      hapticError();
      setAttempts((a) => a + 1);
    }
  };

  const retry = () => {
    setSlots([null, null]);
    setChecked(false);
    setCorrect(false);
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border mb-6 animate-fade-in w-full max-w-lg mx-auto text-left">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
          Step 1: Build the equation
        </span>
        <ReadAloudButton text={questionText} />
      </div>

      <p className="text-lg text-foreground mb-2">{questionText}</p>
      <p className="text-sm text-muted-foreground mb-6">
        Tap the numbers from the story to set up the problem first.
      </p>

      <div className="flex items-center justify-center gap-3 mb-8">
        {slots.map((chipId, i) => (
          <React.Fragment key={i}>
            {i === 1 && <span className="text-3xl font-bold text-primary">{operator}</span>}
            <button
              type="button"
              onClick={() => clearSlot(i)}
              disabled={chipId === null}
              aria-label={chipId === null ? 'Empty number slot' : `Remove ${chipValue(chipId)}`}
              className={`w-16 h-16 rounded-xl text-3xl font-bold flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[48px] min-w-[48px] ${
                chipId !== null
                  ? 'bg-primary text-primary-foreground hover:bg-primary/80 active:scale-95'
                  : 'border-2 border-dashed border-muted-foreground/50 text-muted-foreground'
              }`}
            >
              {chipId !== null ? chipValue(chipId) : '_'}
            </button>
          </React.Fragment>
        ))}
        <span className="text-3xl font-bold text-muted-foreground">=</span>
        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-muted-foreground/50 text-3xl font-bold flex items-center justify-center text-muted-foreground">
          ?
        </div>
      </div>

      <div className="flex justify-center gap-3 flex-wrap mb-6">
        {chips.map((chip) => {
          const used = slots.includes(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => placeChip(chip)}
              disabled={used || (checked && correct)}
              className={`w-14 h-14 min-h-[48px] min-w-[48px] rounded-xl text-2xl font-bold border flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                used
                  ? 'opacity-30 border-border bg-muted text-muted-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary hover:scale-110 active:scale-95'
              }`}
            >
              {chip.value}
            </button>
          );
        })}
      </div>

      {checked && correct && (
        <div className="text-center space-y-4 animate-fade-in">
          <p className="text-xl font-semibold text-success">
            You built the equation! {num1} {operator} {num2} = ?
          </p>
          <Button type="button" onClick={onComplete} size="lg">
            Now Solve It
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      )}

      {checked && !correct && (
        <div className="text-center space-y-4 animate-fade-in">
          <p className="text-lg text-destructive font-semibold">Not quite! Look at the story again.</p>
          {attempts >= 2 && (
            <p className="text-muted-foreground">
              Hint: try <span className="font-bold text-primary">{num1} {operator} {num2}</span>
            </p>
          )}
          <Button type="button" onClick={retry} variant="outline" size="lg">
            Try Again
          </Button>
        </div>
      )}

      {!checked && (
        <div className="text-center">
          <Button
            type="button"
            onClick={checkEquation}
            size="lg"
            disabled={slots.some((s) => s === null)}
          >
            Check Equation
          </Button>
        </div>
      )}
    </div>
  );
};

export default EquationBuilder;
