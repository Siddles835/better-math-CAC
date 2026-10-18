import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExploreShell from '@/components/explore/ExploreShell';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import {
  explorePromptSignature,
  generateExplorePrompt,
  loadLastPromptSignature,
  saveLastPromptSignature,
  type ExploreBand,
  type NumberLinePrompt,
} from '@/lib/explore';
import { WaysFooter, useExploreSave } from './activityHelpers';

/** Choose readable intermediate tick labels for the given range. */
export const numberLineTicks = (min: number, max: number, maxLabels = 7): number[] => {
  const span = max - min;
  if (span <= 0) return [min];
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100];
  const fitsLabels = (value: number) => {
    return span / value <= maxLabels - 1;
  };
  let step = candidates.find(fitsLabels) ?? Math.ceil(span / (maxLabels - 1));
  if (step < 1) step = 1;
  const ticks = new Set<number>([min, max]);
  const start = Math.ceil(min / step) * step;
  for (let value = start; value < max; value += step) {
    const inside = value > min && value < max;
    if (inside) ticks.add(value);
  }
  return [...ticks].sort((a, b) => a - b);
};

export const snapToIncrement = (raw: number, min: number, max: number, hop: number): number => {
  const clamped = Math.min(max, Math.max(min, raw));
  if (hop <= 0) return Math.round(clamped);
  const snapped = Math.round((clamped - min) / hop) * hop + min;
  return Math.min(max, Math.max(min, snapped));
};

export const clientXToValue = (
  clientX: number,
  trackLeft: number,
  trackWidth: number,
  min: number,
  max: number,
  hop: number
): number => {
  if (trackWidth <= 0) return min;
  const ratio = Math.min(1, Math.max(0, (clientX - trackLeft) / trackWidth));
  return snapToIncrement(min + ratio * (max - min), min, max, hop);
};

const NumberLineActivity: React.FC<{ band: ExploreBand }> = ({ band }) => {
  const { t } = useTranslation('explore');
  const { announce, prefs } = useAccessibility();
  const { persist } = useExploreSave('number-line');
  const [entropy, setEntropy] = useState(() => Date.now());
  const prompt = useMemo(() => {
    const prev = loadLastPromptSignature('number-line');
    const next = generateExplorePrompt('number-line', band, entropy, prev) as NumberLinePrompt;
    saveLastPromptSignature('number-line', explorePromptSignature(next));
    return next;
  }, [band, entropy]);
  const [pos, setPos] = useState(prompt.start);
  const [ways, setWays] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastAnnounced = useRef(prompt.start);

  React.useEffect(() => {
    setPos(prompt.start);
    lastAnnounced.current = prompt.start;
  }, [prompt.start, prompt.seed]);

  const setValue = useCallback(
    (next: number, announceNow = false) => {
      const snapped = snapToIncrement(next, prompt.min, prompt.max, prompt.hop);
      setPos((prev) => {
        if (prev !== snapped) setWays((count) => count + 1);
        return snapped;
      });
      if (announceNow && lastAnnounced.current !== snapped) {
        lastAnnounced.current = snapped;
        announce(t('line_place', { n: snapped }));
      }
    },
    [announce, prompt.hop, prompt.max, prompt.min, t]
  );

  const move = (delta: number) => {
    setValue(pos + delta, true);
  };

  const valueFromEvent = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return pos;
    const rect = track.getBoundingClientRect();
    return clientXToValue(clientX, rect.left, rect.width, prompt.min, prompt.max, prompt.hop);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setValue(valueFromEvent(event.clientX));
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setValue(valueFromEvent(event.clientX));
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    const finalValue = valueFromEvent(event.clientX);
    setValue(finalValue, true);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(prompt.hop);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      move(-prompt.hop);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setValue(prompt.min, true);
    } else if (event.key === 'End') {
      event.preventDefault();
      setValue(prompt.max, true);
    } else if (event.key === 'PageUp') {
      event.preventDefault();
      move(prompt.hop * 5);
    } else if (event.key === 'PageDown') {
      event.preventDefault();
      move(-prompt.hop * 5);
    }
  };

  const compareKey =
    pos < prompt.compare ? 'line_smaller' : pos > prompt.compare ? 'line_larger' : 'line_same';

  const title = t('act_number_line');
  const speak = t('line_place', { n: pos });
  const pct = prompt.max === prompt.min ? 0 : ((pos - prompt.min) / (prompt.max - prompt.min)) * 100;
  const comparePct =
    prompt.max === prompt.min
      ? 0
      : ((prompt.compare - prompt.min) / (prompt.max - prompt.min)) * 100;
  const ticks = numberLineTicks(prompt.min, prompt.max);
  const calm = prefs.calmBackground || prefs.reduceMotion;

  return (
    <ExploreShell
      testId="explore-activity-number-line"
      title={title}
      speakText={speak}
      footer={
        <WaysFooter
          waysFound={ways}
          onAnother={() => setEntropy(Date.now())}
          onSave={() => persist(ways, title)}
        />
      }
    >
      <p className="text-lg" dir="ltr">
        {t('line_place', { n: pos })}
      </p>
      <p className="text-sm text-muted-foreground" dir="ltr">
        {t('line_compare', { n: prompt.compare })}
      </p>

      <div className="my-4 select-none" dir="ltr">
        <div
          ref={trackRef}
          data-testid="number-line-track"
          className={`relative h-14 rounded-full border border-border bg-slate-800/80 ${
            calm ? '' : 'shadow-inner'
          }`}
          style={{ touchAction: 'none' }}
          role="slider"
          tabIndex={0}
          aria-valuemin={prompt.min}
          aria-valuemax={prompt.max}
          aria-valuenow={pos}
          aria-valuetext={t('line_place', { n: pos })}
          aria-label={t('act_number_line')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          {/* Track fill */}
          <div
            className="pointer-events-none absolute inset-y-5 start-3 end-3 rounded-full bg-slate-600/80"
            aria-hidden
          />

          {/* Tick marks + labels */}
          {ticks.map((tick) => {
            const left =
              prompt.max === prompt.min
                ? 0
                : ((tick - prompt.min) / (prompt.max - prompt.min)) * 100;
            const isEnd = tick === prompt.min || tick === prompt.max;
            return (
              <div
                key={tick}
                className="pointer-events-none absolute top-0 bottom-0"
                style={{ left: `calc(12px + (100% - 24px) * ${left / 100})` }}
              >
                <span
                  className={`absolute left-1/2 top-2 h-3 w-0.5 -translate-x-1/2 ${
                    isEnd ? 'bg-amber-200' : 'bg-slate-400'
                  }`}
                  aria-hidden
                />
                <span
                  className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 text-xs tabular-nums ${
                    isEnd ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {tick}
                </span>
              </div>
            );
          })}

          {/* Compare marker */}
          <div
            className="pointer-events-none absolute top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-sky-400/80"
            style={{ left: `calc(12px + (100% - 24px) * ${comparePct / 100})` }}
            aria-hidden
            title={String(prompt.compare)}
          />

          {/* Draggable thumb — large hit target */}
          <div
            data-testid="number-line-thumb"
            className="absolute top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-100 bg-amber-300 shadow-md"
            style={{ left: `calc(12px + (100% - 24px) * ${pct / 100})` }}
            aria-hidden
          />
        </div>
        <div className="mt-8 flex justify-between text-sm font-medium tabular-nums text-muted-foreground">
          <span>{prompt.min}</span>
          <span aria-live="polite">{pos}</span>
          <span>{prompt.max}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11" onClick={() => move(-prompt.hop)}>
          {t('line_left')}
        </Button>
        <Button type="button" className="min-h-11" onClick={() => move(prompt.hop)}>
          {t('line_right')}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => move(-10)}>
          {t('line_jump_back_ten')}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => move(10)}>
          {t('line_jump_forward_ten')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => announce(t(compareKey, { n: prompt.compare }))}
        >
          {t(compareKey, { n: prompt.compare })}
        </Button>
      </div>
      <p className="text-sm" dir="ltr">
        {t('line_hop', { n: prompt.hop })}
      </p>
    </ExploreShell>
  );
};

export default NumberLineActivity;
