import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MATH_SYMBOL_CATEGORIES,
  MATH_SYMBOLS,
  type MathSymbolCategory,
  type MathSymbolEntry,
} from '@/content/mathSymbols';
import { cn } from '@/lib/utils';

interface MathHelperPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MathHelperPanel: React.FC<MathHelperPanelProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation('helper');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MathSymbolCategory | 'all'>('all');
  const [activeId, setActiveId] = useState(MATH_SYMBOLS[0]?.id ?? '');
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return MATH_SYMBOLS.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false;
      if (!needle) return true;
      const hay = [
        entry.symbol,
        entry.id,
        entry.exampleVisual ?? '',
        t(entry.nameKey),
        t(entry.meaningKey),
        t(entry.spokenKey),
        t(entry.exampleKey),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [category, query, t]);

  useEffect(() => {
    if (!open) return;
    if (filtered.length === 0) return;
    if (!filtered.some((entry) => entry.id === activeId)) {
      setActiveId(filtered[0].id);
    }
  }, [activeId, filtered, open]);

  const active: MathSymbolEntry | undefined =
    filtered.find((entry) => entry.id === activeId) ?? filtered[0];

  const speakText = active
    ? `${t(active.nameKey)}. ${t(active.spokenKey)}. ${t(active.meaningKey)}. ${t(active.exampleKey)}`
    : '';

  const moveActive = (delta: number) => {
    if (filtered.length === 0) return;
    const index = Math.max(
      0,
      filtered.findIndex((entry) => entry.id === active?.id)
    );
    const next = filtered[(index + delta + filtered.length) % filtered.length];
    setActiveId(next.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-hidden flex flex-col gap-3 sm:max-w-2xl"
        data-testid="math-helper-panel"
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveActive(1);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveActive(-1);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('blurb')}</DialogDescription>
        </DialogHeader>

        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="sr-only">{t('search')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className="min-h-11 w-full bg-transparent text-foreground focus-visible:outline-none"
            data-testid="math-helper-search"
          />
        </label>

        <div className="flex flex-wrap gap-2" role="group" aria-label={t('categories')}>
          <Button
            type="button"
            size="sm"
            variant={category === 'all' ? 'default' : 'outline'}
            className="min-h-10"
            onClick={() => setCategory('all')}
          >
            {t('allCategories')}
          </Button>
          {MATH_SYMBOL_CATEGORIES.map((cat) => (
            <Button
              key={cat}
              type="button"
              size="sm"
              variant={category === cat ? 'default' : 'outline'}
              className="min-h-10"
              onClick={() => setCategory(cat)}
            >
              {t(`cat_${cat}`)}
            </Button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-[11rem_1fr]">
          <ul
            ref={listRef}
            className="max-h-[40vh] space-y-1 overflow-y-auto rounded-xl border border-border p-1 sm:max-h-none"
            role="listbox"
            aria-label={t('title')}
          >
            {filtered.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={entry.id === active?.id}
                  className={cn(
                    'flex w-full min-h-11 items-center gap-2 rounded-lg px-2 text-start',
                    entry.id === active?.id
                      ? 'bg-primary/15 text-foreground'
                      : 'hover:bg-muted/60'
                  )}
                  onClick={() => setActiveId(entry.id)}
                >
                  <span className="text-2xl font-semibold tabular-nums" dir="ltr" aria-hidden>
                    {entry.symbol}
                  </span>
                  <span className="text-sm">{t(entry.nameKey)}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3 overflow-y-auto max-h-[40vh] sm:max-h-none">
            {active ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-5xl font-semibold leading-none tabular-nums" dir="ltr">
                    {active.symbol}
                  </p>
                  <ReadAloudButton text={speakText} />
                </div>
                <h3 className="text-xl font-semibold">{t(active.nameKey)}</h3>
                <p>
                  <span className="font-medium">{t('meaning')}: </span>
                  {t(active.meaningKey)}
                </p>
                <p>
                  <span className="font-medium">{t('spoken')}: </span>
                  {t(active.spokenKey)}
                </p>
                <p>
                  <span className="font-medium">{t('example')}: </span>
                  {t(active.exampleKey)}
                </p>
                {active.exampleVisual ? (
                  <p className="rounded-lg bg-muted/50 px-3 py-2 text-lg tabular-nums" dir="ltr">
                    <span className="sr-only">{t('visual')}: </span>
                    {active.exampleVisual}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">{t('noResults')}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MathHelperPanel;
