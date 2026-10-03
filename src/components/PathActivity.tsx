import React, { useEffect } from 'react';
import NumberDraw from '@/components/NumberDraw';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import { useAnswerCheck } from '@/hooks/useAnswerCheck';
import type { DigitRead, UnreadableReason } from '@/lib/cognition';
import type { ItemOutcome, PathItem } from '@/lib/cognition/personalPath';

interface PathActivityProps {
  item: PathItem;
  onResult: (outcome: ItemOutcome, value: number) => void;
  onTraceTap: (value: number, target: number) => void;
  onTraceRemove: () => void;
  onTraceDraw: (read: DigitRead, expected?: number) => void;
}

const Token: React.FC<{
  filled: boolean;
  locked?: boolean;
  label: string;
}> = ({ filled, locked, label }) => (
  <div
    aria-label={label}
    className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 ${
      filled ? 'bg-sky-500 border-sky-400' : 'border-dashed border-muted-foreground/40'
    } ${locked ? 'opacity-90' : ''}`}
  />
);

const PathActivity: React.FC<PathActivityProps> = ({
  item,
  onResult,
  onTraceTap,
  onTraceRemove,
  onTraceDraw,
}) => {
  const check = useAnswerCheck();
  const resetCheck = check.reset;
  const [reason, setReason] = React.useState<UnreadableReason | null>(null);
  const initial =
    item.kind === 'count_on' || item.kind === 'take_away' || item.kind === 'tens_ones' ? item.start : 0;
  const [count, setCount] = React.useState(initial);

  useEffect(() => {
    setCount(
      item.kind === 'count_on' || item.kind === 'take_away' || item.kind === 'tens_ones' ? item.start : 0
    );
    resetCheck();
  }, [item.id, item.kind, item.start, resetCheck]);

  const locked = check.state.lockedSuccess;
  const maxCount = item.kind === 'tens_ones' ? 14 : 9;
  const minCount =
    item.kind === 'count_on' || item.kind === 'tens_ones' ? item.start : item.kind === 'take_away' ? item.target : 0;

  const canAdd =
    !locked &&
    count < maxCount &&
    !(item.hardStop && count >= item.target) &&
    item.kind !== 'write_digit' &&
    item.kind !== 'take_away';

  const add = () => {
    if (!canAdd) return;
    const next = count + 1;
    setCount(next);
    check.noteChange();
    onTraceTap(next, item.target);
  };

  const remove = () => {
    if (locked || count <= minCount) return;
    setCount(count - 1);
    check.noteChange();
    onTraceRemove();
  };

  const finish = (value: number, extra?: Partial<ItemOutcome>) => {
    const correct = extra?.correct ?? value === item.target;
    const next = check.submit(correct ? 'correct' : 'incorrect');
    if (!next) return;
    onResult(
      {
        correct,
        overshoot: value > item.target,
        reversal: extra?.reversal ?? false,
      },
      value
    );
  };

  const handleDraw = (read: DigitRead) => {
    if (read.status === 'unreadable') {
      setReason(read.reason ?? 'low_confidence');
      check.submit('unreadable');
      return;
    }
    setReason(null);
    onTraceDraw(read, item.digit);
    const ok = read.digit === item.digit && !read.reversal;
    finish(read.digit, { correct: ok, reversal: read.reversal });
  };

  const handleTyped = (value: number) => {
    const read: DigitRead = {
      status: 'ok',
      digit: value,
      confidence: 1,
      reversal: false,
      strokeCount: 0,
      startQuadrant: 0,
      parts: [value],
    };
    handleDraw(read);
  };

  const showCount = item.kind !== 'write_digit';
  const slotCount = item.kind === 'tens_ones' ? item.target : Math.max(item.target, count, item.start, 1);
  const success = check.state.verdict === 'correct';

  return (
    <div className="w-full max-w-xl mx-auto text-center">
      <div className="flex items-start justify-center gap-3 mb-5">
        <p className="text-lg sm:text-xl font-medium text-foreground leading-snug">{item.prompt}</p>
        <ReadAloudButton text={item.speak} autoPlay={item.kind === 'hear_build'} />
      </div>

      {item.kind === 'write_digit' ? (
        <NumberDraw
          key={item.id}
          prompt=""
          result={check.state.verdict}
          unreadableReason={reason}
          checkEnabled={check.canSubmit(true)}
          disabled={locked}
          showTypeHint={check.state.unreadableStreak >= 3}
          onChange={() => check.noteChange()}
          onRead={handleDraw}
          onTyped={handleTyped}
        />
      ) : (
        <>
          {item.kind === 'tens_ones' && (
            <p className="text-sm text-muted-foreground mb-3">
              One ten
              <span className="mx-2 inline-block h-7 w-20 rounded-md bg-sky-700 align-middle" />
              plus ones you add
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2 mb-5 min-h-[48px]">
            {Array.from({ length: slotCount }, (_, i) => {
              const tokenLocked = item.kind === 'count_on' || item.kind === 'tens_ones' ? i < item.start : false;
              const filled = i < count;
              return (
                <Token
                  key={`${item.id}-${i}`}
                  filled={filled}
                  locked={tokenLocked}
                  label={filled ? `Token ${i + 1}` : `Empty ${i + 1}`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <Button type="button" variant="outline" onClick={remove} disabled={locked || count <= minCount}>
              {item.kind === 'take_away' ? 'Take one away' : 'Take one back'}
            </Button>
            {item.kind !== 'take_away' && (
              <Button type="button" onClick={add} disabled={!canAdd}>
                Add one
              </Button>
            )}
          </div>

          {showCount && (
            <p className="text-2xl font-semibold tabular-nums mb-4" dir="ltr">
              {count}
            </p>
          )}

          {check.canSubmit(true) && (
            <Button type="button" size="lg" onClick={() => finish(count)}>
              Check
            </Button>
          )}
        </>
      )}

      {item.kind !== 'write_digit' && check.state.verdict === 'incorrect' && (
        <p className="mt-4 text-base font-medium text-foreground">Not quite, try again</p>
      )}
      {success && <p className="mt-4 text-base font-medium text-emerald-400">That matches.</p>}
      {check.state.verdict === 'unreadable' && item.kind !== 'write_digit' && (
        <p className="mt-4 text-base font-medium">I couldn't read that one. Try again.</p>
      )}
    </div>
  );
};

export default PathActivity;
