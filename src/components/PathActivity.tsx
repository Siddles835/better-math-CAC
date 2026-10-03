import { tx } from '@/i18n/tx';
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
  const maxCount = item.target > 12 ? 100 : item.kind === 'tens_ones' ? 20 : 12;
  const minCount =
    item.kind === 'count_on' || item.kind === 'tens_ones' ? item.start : item.kind === 'take_away' ? item.target : 0;

  const canAdd =
    !locked &&
    count < maxCount &&
    !(item.hardStop && count >= item.target) &&
    item.kind !== 'write_digit' &&
    item.kind !== 'take_away';

  const add = (step = 1) => {
    if (locked || item.kind === 'write_digit' || item.kind === 'take_away') return;
    const next = count + step;
    if (next > maxCount || (item.hardStop && count >= item.target)) return;
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

  const prompt =
    item.kind === 'count_on'
      ? tx('ui:pathCountOn', { start: item.start, add: item.add })
      : item.kind === 'exact_total'
        ? tx('ui:pathExact', { target: item.target })
        : item.kind === 'take_away'
          ? tx('ui:pathTake', { start: item.start, add: item.add })
          : item.kind === 'same_sum'
            ? tx('ui:pathSame', { start: item.start, add: item.add, target: item.target })
            : item.kind === 'write_digit'
              ? tx('ui:pathWrite', { digit: item.digit ?? item.target })
              : item.kind === 'hear_build'
                ? tx('ui:pathHear', { target: item.target })
                : item.kind === 'compare'
                  ? tx('ui:pathCompare', { start: item.start, add: item.add })
                  : item.kind === 'neighbor'
                    ? tx(item.add < 0 ? 'ui:pathBefore' : 'ui:pathAfter', { start: item.start })
                    : tx('ui:pathTens', { add: item.add, target: item.target });
  const showCount = item.kind !== 'write_digit' && item.kind !== 'compare' && item.kind !== 'neighbor';
  const big = item.target > 12 && showCount;
  const slotCount = big ? 0 : item.kind === 'tens_ones' ? Math.min(item.target, 20) : Math.max(item.target, count, item.start, 1);
  const success = check.state.verdict === 'correct';

  return (
    <div className="w-full max-w-xl mx-auto text-center">
      <div className="flex items-start justify-center gap-3 mb-5">
        <p className="text-lg sm:text-xl font-medium text-foreground leading-snug">{prompt}</p>
        <ReadAloudButton text={prompt} autoPlay={item.kind === 'hear_build'} />
      </div>

      {item.kind === 'compare' ? (
        <div className="flex justify-center gap-3" dir="ltr">
          {[item.start, item.add].map((choice, index) => (
            <Button key={`${choice}-${index}`} type="button" size="lg" className="min-h-[56px] min-w-[72px]" disabled={locked} onClick={() => finish(choice)}>
              {choice}
            </Button>
          ))}
        </div>
      ) : item.kind === 'neighbor' || item.kind === 'write_digit' ? (
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
          {big ? (
            <div className="mb-5" dir="ltr">
              <div className="flex flex-wrap justify-center gap-2 mb-3">
                {Array.from({ length: Math.floor(count / 10) }, (_, i) => (
                  <span key={i} className="inline-flex h-8 min-w-16 items-center justify-center rounded-md bg-sky-700 px-2 text-sm text-white">10</span>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-1 min-h-4">
                {Array.from({ length: count % 10 }, (_, i) => (
                  <span key={i} className="h-4 w-4 rounded-full bg-primary" />
                ))}
              </div>
            </div>
          ) : null}
          {!big && <div className="flex flex-wrap justify-center gap-2 mb-5 min-h-[48px]">
            {Array.from({ length: slotCount }, (_, i) => {
              const tokenLocked = item.kind === 'count_on' || item.kind === 'tens_ones' ? i < item.start : false;
              const filled = i < count;
              return (
                <Token
                  key={`${item.id}-${i}`}
                  filled={filled}
                  locked={tokenLocked}
                  label={filled ? tx('ui:pathToken', { n: i + 1 }) : tx('ui:pathEmpty', { n: i + 1 })}
                />
              );
            })}
          </div>}

          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {big && (
              <Button type="button" onClick={() => add(10)} disabled={locked || count + 10 > maxCount}>
                {tx('ui:pathAddTen')}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={remove} disabled={locked || count <= minCount}>
              {item.kind === 'take_away' ? tx('ui:pathTakeOne') : tx('ui:pathTakeBack')}
            </Button>
            {item.kind !== 'take_away' && (
              <Button type="button" onClick={() => add(1)} disabled={!canAdd}>
                {tx('ui:pathAddOne')}
              </Button>
            )}
          </div>

          {showCount && (
            <p className="text-2xl font-semibold tabular-nums mb-4" dir="ltr">
              {count}
            </p>
          )}

          {check.canSubmit(true) && (
            <Button type="button" size="lg" onClick={() => finish(count)}>{tx('ui:s_4b5e84be0e')}</Button>
          )}
        </>
      )}

      {item.kind !== 'write_digit' && check.state.verdict === 'incorrect' && (
        <p className="mt-4 text-base font-medium text-foreground">{tx('ui:s_978780d5aa')}</p>
      )}
      {success && <p className="mt-4 text-base font-medium text-emerald-400">{tx('ui:s_b897d22764')}</p>}
      {check.state.verdict === 'unreadable' && item.kind !== 'write_digit' && (
        <p className="mt-4 text-base font-medium">{tx('ui:s_0703bb7bd5')}</p>
      )}
    </div>
  );
};

export default PathActivity;
