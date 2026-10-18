import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ActiveObjectGlyph from '@/components/objects/ActiveObjectGlyph';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ArrayGridProps {
  initialRows?: number;
  initialCols?: number;
  maxRows?: number;
  maxCols?: number;
  className?: string;
  onTotalChange?: (total: number, rows: number, cols: number) => void;
  testId?: string;
}

/** Rows × cols array; product/total always matches visible cells. */
const ArrayGrid: React.FC<ArrayGridProps> = ({
  initialRows = 2,
  initialCols = 3,
  maxRows = 6,
  maxCols = 6,
  className,
  onTotalChange,
  testId = 'array-grid',
}) => {
  const { t } = useTranslation('explore');
  const [rows, setRows] = useState(() => Math.min(maxRows, Math.max(1, initialRows)));
  const [cols, setCols] = useState(() => Math.min(maxCols, Math.max(1, initialCols)));
  const total = rows * cols;

  useEffect(() => {
    onTotalChange?.(total, rows, cols);
  }, [cols, onTotalChange, rows, total]);

  return (
    <div className={cn('flex flex-col gap-3', className)} data-testid={testId}>
      <p className="text-center text-lg font-medium" dir="ltr" data-testid={`${testId}-product`}>
        {t('manip_array_product', { rows, cols, total })}
      </p>
      <div
        className="mx-auto inline-grid gap-1 rounded-xl border border-border/70 bg-card/30 p-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        role="grid"
        aria-label={t('manip_array_product', { rows, cols, total })}
        dir="ltr"
        data-testid={`${testId}-cells`}
      >
        {Array.from({ length: total }).map((_, index) => (
          <span key={index} role="gridcell" className="flex items-center justify-center">
            <ActiveObjectGlyph role="count" index={index} size="sm" />
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => setRows((n) => Math.min(maxRows, n + 1))}
          disabled={rows >= maxRows}
        >
          {t('manip_add_row')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => setRows((n) => Math.max(1, n - 1))}
          disabled={rows <= 1}
        >
          {t('manip_remove_row')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => setCols((n) => Math.min(maxCols, n + 1))}
          disabled={cols >= maxCols}
        >
          {t('manip_add_col')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => setCols((n) => Math.max(1, n - 1))}
          disabled={cols <= 1}
        >
          {t('manip_remove_col')}
        </Button>
      </div>
    </div>
  );
};

export default ArrayGrid;
