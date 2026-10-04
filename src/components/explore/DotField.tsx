import React from 'react';
import { useTranslation } from 'react-i18next';

type Arrangement = 'line' | 'triangle' | 'square' | 'scatter' | 'dice' | 'rows';
type DotPos = { x: number; y: number };

interface DotFieldProps {
  count: number;
  arrangement?: Arrangement;
  hidden?: boolean;
  label?: string;
  className?: string;
}

const positionsFor = (count: number, arrangement: Arrangement): DotPos[] => {
  const dots: DotPos[] = [];
  if (arrangement === 'line') {
    for (let i = 0; i < count; i++) dots.push({ x: 10 + (i * 80) / Math.max(count, 1), y: 50 });
    return dots;
  }
  if (arrangement === 'triangle') {
    let placed = 0;
    let row = 1;
    while (placed < count) {
      for (let i = 0; i < row && placed < count; i++) {
        const width = row * 14;
        dots.push({ x: 50 - width / 2 + i * 14 + 7, y: 18 + (row - 1) * 16 });
        placed += 1;
      }
      row += 1;
    }
    return dots;
  }
  if (arrangement === 'square') {
    const side = Math.ceil(Math.sqrt(count));
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / side);
      const c = i % side;
      dots.push({ x: 20 + c * 20, y: 20 + r * 20 });
    }
    return dots;
  }
  if (arrangement === 'dice' || arrangement === 'rows') {
    const cols = arrangement === 'dice' ? 3 : 5;
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      dots.push({ x: 18 + c * 22, y: 18 + r * 22 });
    }
    return dots;
  }
  for (let i = 0; i < count; i++) {
    const x = 15 + ((i * 37) % 70);
    const y = 15 + ((i * 53) % 70);
    dots.push({ x, y });
  }
  return dots;
};

const DotField: React.FC<DotFieldProps> = ({
  count,
  arrangement = 'scatter',
  hidden = false,
  label,
  className = '',
}) => {
  const { t } = useTranslation('explore');
  const dots = positionsFor(Math.max(0, count), arrangement);
  const aria = label ?? t('counters_label', { count });

  return (
    <div
      role="img"
      aria-label={hidden ? t('dots_stay') : aria}
      aria-hidden={hidden}
      className={`relative mx-auto aspect-square w-full max-w-[220px] rounded-2xl border border-border/60 bg-sky-950/40 ${className}`}
      dir="ltr"
    >
      {!hidden &&
        dots.map((dot, index) => (
          <span
            key={`${dot.x}-${dot.y}-${index}`}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200 shadow-sm"
            style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
          />
        ))}
    </div>
  );
};

export default DotField;
