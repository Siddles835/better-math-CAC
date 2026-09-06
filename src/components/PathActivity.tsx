import React, { useEffect, useState } from 'react';
import NumberDraw from '@/components/NumberDraw';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import type { DigitRead } from '@/lib/cognition';
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
  const initial =
    item.kind === 'count_on' || item.kind === 'take_away' || item.kind === 'tens_ones' ? item.start : 0;
  const [count, setCount] = useState(initial);
  const [checked, setChecked] = useState(false);
  const [digitOk, setDigitOk] = useState(false);

  useEffect(() => {
    setCount(
      item.kind === 'count_on' || item.kind === 'take_away' || item.kind === 'tens_ones' ? item.start : 0
    );
    setChecked(false);
    setDigitOk(false);
  }, [item.id, item.kind, item.start]);

  const maxCount = item.kind === 'tens_ones' ? 14 : 9;
  const minCount =
    item.kind === 'count_on' || item.kind === 'tens_ones' ? item.start : item.kind === 'take_away' ? item.target : 0;

  const canAdd =
    !checked &&
    count < maxCount &&
    !(item.hardStop && count >= item.target) &&
    item.kind !== 'write_digit' &&
    item.kind !== 'take_away';

  const add = () => {
    if (!canAdd) return;
    const next = count + 1;
    setCount(next);
    onTraceTap(next, item.target);
  };

  const remove = () => {
    if (checked || count <= minCount) return;
    setCount(count - 1);
    onTraceRemove();
  };

  const finish = (value: number, extra?: Partial<ItemOutcome>) => {
    if (checked) return;
    setChecked(true);
    onResult(
      {
        correct: extra?.correct ?? value === item.target,
        overshoot: value > item.target,
        reversal: extra?.reversal ?? false,
      },
      value
    );
  };

  const handleDraw = (read: DigitRead) => {
    onTraceDraw(read, item.digit);
    const ok = read.digit === item.digit;
    setDigitOk(ok && !read.reversal);
    finish(read.digit, { correct: ok, reversal: read.reversal });
  };

  const showCount = item.kind !== 'write_digit';
  const slotCount =
    item.kind === 'tens_ones' ? item.target : Math.max(item.target, count, item.start, 1);

  return (
    <div className="w-full max-w-xl mx-auto text-center">
      <div className="flex items-start justify-center gap-3 mb-5">
        <p className="text-lg sm:text-xl font-medium text-foreground leading-snug">{item.prompt}</p>
        <ReadAloudButton text={item.speak} autoPlay={item.kind === 'hear_build'} />
      </div>

      {item.kind === 'write_digit' ? (
        <NumberDraw prompt="" expected={item.digit} onRead={handleDraw} disabled={checked} />
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
              const locked = item.kind === 'count_on' || item.kind === 'tens_ones' ? i < item.start : false;
              const filled = i < count;
              return (
                <Token
                  key={`${item.id}-${i}`}
                  filled={filled}
                  locked={locked}
                  label={filled ? `Token ${i + 1}` : `Empty ${i + 1}`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <Button type="button" variant="outline" onClick={remove} disabled={checked || count <= minCount}>
              {item.kind === 'take_away' ? 'Take one away' : 'Take one back'}
            </Button>
            {item.kind !== 'take_away' && (
              <Button type="button" onClick={add} disabled={!canAdd}>
                Add one
              </Button>
            )}
          </div>

          {showCount && <p className="text-2xl font-semibold tabular-nums mb-4">{count}</p>}

          {!checked && (
            <Button type="button" size="lg" onClick={() => finish(count)}>
              Check
            </Button>
          )}
        </>
      )}

      {checked && (
        <p className={`mt-4 text-base font-medium ${count === item.target || digitOk ? 'text-emerald-400' : 'text-foreground'}`}>
          {count === item.target || digitOk ? 'That matches.' : `Looking for ${item.target}. Next one is ready.`}
        </p>
      )}
    </div>
  );
};

export default PathActivity;
