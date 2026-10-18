import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ActiveObjectGlyph from '@/components/objects/ActiveObjectGlyph';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ManipulativeBoardProps {
  initialCount?: number;
  max?: number;
  className?: string;
  onCountChange?: (count: number) => void;
  testId?: string;
}

/**
 * Reusable counters: displayed value always matches the number of counters.
 */
const ManipulativeBoard: React.FC<ManipulativeBoardProps> = ({
  initialCount = 0,
  max = 20,
  className,
  onCountChange,
  testId = 'manipulative-board',
}) => {
  const { t } = useTranslation('explore');
  const [count, setCount] = useState(() => Math.min(max, Math.max(0, initialCount)));
  const [history, setHistory] = useState<number[]>([]);

  const commit = useCallback(
    (next: number, recordUndo = true) => {
      const clamped = Math.min(max, Math.max(0, next));
      setCount((prev) => {
        if (recordUndo && clamped !== prev) {
          setHistory((h) => [...h, prev]);
        }
        onCountChange?.(clamped);
        return clamped;
      });
    },
    [max, onCountChange]
  );

  const add = () => commit(count + 1);
  const remove = () => commit(count - 1);
  const reset = () => commit(0);
  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setCount(prev);
      onCountChange?.(prev);
      return h.slice(0, -1);
    });
  };

  return (
    <div className={cn('flex flex-col gap-3', className)} data-testid={testId}>
      <p
        className="text-center text-3xl font-semibold tabular-nums"
        data-testid={`${testId}-value`}
        aria-live="polite"
        dir="ltr"
      >
        {count}
      </p>
      <div
        className="flex flex-wrap justify-center gap-2 min-h-[3rem]"
        role="list"
        aria-label={t('counters_label', { count })}
        data-testid={`${testId}-tokens`}
      >
        {Array.from({ length: count }).map((_, index) => (
          <span key={index} role="listitem">
            <ActiveObjectGlyph role="count" index={index} size="md" />
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" className="min-h-11" onClick={add} disabled={count >= max}>
          {t('add_counter')}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={remove} disabled={count <= 0}>
          {t('remove_counter')}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={reset} disabled={count === 0}>
          {t('clear_counters')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={undo}
          disabled={history.length === 0}
          data-testid={`${testId}-undo`}
        >
          {t('manip_undo')}
        </Button>
      </div>
    </div>
  );
};

export default ManipulativeBoard;
