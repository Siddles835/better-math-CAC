import React from 'react';
import { useTranslation } from 'react-i18next';

interface TenFrameProps {
  filled: number;
  capacity?: number;
  onCellClick?: (index: number) => void;
}

const TenFrame: React.FC<TenFrameProps> = ({ filled, capacity = 10, onCellClick }) => {
  const { t } = useTranslation('explore');
  const cells = Math.min(20, Math.max(10, capacity));
  const rows = cells <= 10 ? 2 : 4;
  const cols = 5;

  return (
    <div
      role="group"
      aria-label={t('ten_frame_label', { count: filled })}
      className="inline-grid gap-1 rounded-xl border-2 border-sky-300/50 bg-sky-950/30 p-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      dir="ltr"
    >
      {Array.from({ length: rows * cols }).map((_, index) => {
        const on = index < filled;
        return (
          <button
            key={index}
            type="button"
            disabled={!onCellClick}
            onClick={() => onCellClick?.(index)}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-sky-400/40 bg-slate-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            aria-label={on ? t('counters_label', { count: index + 1 }) : t('add_counter')}
          >
            {on ? <span className="h-5 w-5 rounded-full bg-amber-300" aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
};

export default TenFrame;
