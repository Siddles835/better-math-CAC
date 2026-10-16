import { tx } from '@/i18n/tx';
import React, { useEffect, useMemo, useState } from 'react';
import Apple from '@/components/Apple';
import Basket from '@/components/Basket';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import { formatNumberDisplay } from '@/lib/i18n/language';
import { hapticSuccess, hapticError, hapticTap } from '@/lib/haptics';
import {
  getTeachStory,
  type StoryAction,
  type StoryItem,
} from '@/lib/teachStories';
import type { PlanetId } from '@/lib/planets';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeachStoryProps {
  planet: PlanetId;
  index: 0 | 1;
  onReady: (ready: boolean) => void;
}

const Dot: React.FC<{
  item: StoryItem;
  selected?: boolean;
  distractor?: boolean;
  onClick?: () => void;
  label: string;
}> = ({ item, selected, distractor, onClick, label }) => {
  if (item === 'apples') {
    return (
      <Apple
        size="md"
        onClick={onClick}
        label={label}
        className={cn(selected && 'ring-2 ring-primary', distractor && 'opacity-80')}
      />
    );
  }
  if (item === 'pencils') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={selected}
        className={cn(
          'inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          selected && 'ring-2 ring-primary'
        )}
      >
        <svg viewBox="0 0 20 60" className="h-12 w-4" aria-hidden>
          <polygon points="10,60 5,48 15,48" fill="hsl(var(--foreground))" opacity="0.8" />
          <rect x="5" y="10" width="10" height="38" fill="hsl(var(--pencil))" />
          <rect x="5" y="0" width="10" height="10" fill="hsl(var(--apple))" opacity="0.7" />
          <rect x="5" y="8" width="10" height="4" fill="hsl(var(--muted-foreground))" />
        </svg>
      </button>
    );
  }
  // Stars / blocks: correct picks use primary; distractors use muted so kids can tell them apart.
  const tone = distractor ? 'bg-muted-foreground/50' : item === 'stars' ? 'bg-primary' : 'bg-success';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-12 w-12 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        tone,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    />
  );
};

const ActionPlay: React.FC<{
  action: StoryAction;
  done: boolean;
  onDone: () => void;
}> = ({ action, done, onDone }) => {
  const { prefs } = useAccessibility();
  const show = (n: number) => formatNumberDisplay(n, prefs.numberStyle);
  const [count, setCount] = useState(action.start ?? 0);
  const [supply, setSupply] = useState(action.supply ?? 0);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const selectSlots = useMemo(() => {
    if (action.kind !== 'select') return [] as boolean[];
    const correct = Array.from({ length: action.supply ?? 0 }, () => true);
    const wrong = Array.from({ length: action.distractors ?? 0 }, () => false);
    // Interleave so correct items are not always first.
    const slots: boolean[] = [];
    let c = 0;
    let w = 0;
    while (c < correct.length || w < wrong.length) {
      if (c < correct.length) {
        slots.push(true);
        c += 1;
      }
      if (w < wrong.length) {
        slots.push(false);
        w += 1;
      }
    }
    return slots;
  }, [action]);

  useEffect(() => {
    if (action.kind === 'select') {
      setSelected(Array.from({ length: selectSlots.length }, () => false));
    }
  }, [action, selectSlots.length]);

  useEffect(() => {
    if (done) return;
    if (action.kind === 'fill' || action.kind === 'add' || action.kind === 'remove') {
      if (count === action.target) {
        hapticSuccess();
        setCorrect(true);
        setChecked(true);
        onDone();
      }
    }
  }, [count, action, done, onDone]);

  const prompt = tx(action.promptKey, action.promptValues);

  const checkSelectOrTens = () => {
    let ok = false;
    if (action.kind === 'select') {
      const correctPicked = selected.filter((on, i) => on && selectSlots[i]).length;
      const wrongPicked = selected.filter((on, i) => on && !selectSlots[i]).length;
      ok = correctPicked === action.target && wrongPicked === 0;
    } else {
      ok = tens * 10 + ones === action.target;
    }
    setChecked(true);
    setCorrect(ok);
    if (ok) {
      hapticSuccess();
      onDone();
    } else {
      hapticError();
    }
  };

  const reset = () => {
    setCount(action.start ?? 0);
    setSupply(action.supply ?? 0);
    setTens(0);
    setOnes(0);
    setChecked(false);
    setCorrect(false);
    if (action.kind === 'select') {
      setSelected(Array.from({ length: selectSlots.length }, () => false));
    }
  };

  if (done || correct) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="flex items-center gap-2 text-success">
          <Check className="h-7 w-7" aria-hidden />
          <span className="text-xl font-semibold">{tx('ui:storyNice')}</span>
        </div>
        <p className="text-lg font-medium" dir="ltr">
          {show(action.target)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-lg font-medium text-foreground text-center">{prompt}</p>

      {(action.kind === 'fill' || action.kind === 'add') && (
        <>
          <p className="text-sm text-muted-foreground" dir="ltr">
            {tx('ui:youHave')}: {show(count)}
          </p>
          {action.item === 'apples' ? (
            <Basket
              count={count}
              onRemove={
                count > (action.start ?? 0)
                  ? () => {
                      setCount((n) => n - 1);
                      setSupply((n) => n + 1);
                    }
                  : undefined
              }
            />
          ) : (
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {Array.from({ length: count }).map((_, i) => (
                <Dot key={i} item={action.item} label={tx('ui:storyVisualAlt', { count: 1 })} />
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2 max-w-md">
            {Array.from({ length: supply }).map((_, i) => (
              <Dot
                key={i}
                item={action.item}
                label={tx('ui:storyAddOne')}
                onClick={() => {
                  hapticTap();
                  setCount((n) => n + 1);
                  setSupply((n) => Math.max(0, n - 1));
                }}
              />
            ))}
          </div>
        </>
      )}

      {action.kind === 'remove' && (
        <>
          <p className="text-sm text-muted-foreground" dir="ltr">
            {tx('ui:youHave')}: {show(count)}
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-sm">
            {Array.from({ length: count }).map((_, i) => (
              <Dot
                key={i}
                item={action.item}
                label={tx('ui:storyRemoveOne')}
                onClick={() => {
                  hapticTap();
                  setCount((n) => Math.max(0, n - 1));
                }}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{tx('ui:storyTapToRemove')}</p>
        </>
      )}

      {action.kind === 'select' && (
        <div className="flex flex-wrap justify-center gap-2 max-w-md">
          {selectSlots.map((isCorrectSlot, i) => (
            <Dot
              key={i}
              item={action.item}
              distractor={!isCorrectSlot}
              selected={selected[i]}
              label={tx('ui:storyTapSelect')}
              onClick={() => {
                hapticTap();
                setSelected((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
                setChecked(false);
              }}
            />
          ))}
        </div>
      )}

      {action.kind === 'tens-ones' && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-end justify-center gap-3">
            {Array.from({ length: tens }).map((_, i) => (
              <div key={`t${i}`} className="flex h-16 w-8 flex-col justify-end gap-0.5 rounded-md bg-primary/80 p-0.5">
                {Array.from({ length: 10 }, (_, j) => (
                  <span key={j} className="h-1 grow rounded-sm bg-primary-foreground/70" />
                ))}
              </div>
            ))}
            <div className="flex flex-wrap gap-1 max-w-[7rem]">
              {Array.from({ length: ones }).map((_, i) => (
                <span key={`o${i}`} className="h-4 w-4 rounded-sm bg-accent" />
              ))}
            </div>
          </div>
          <p className="text-lg font-semibold" dir="ltr">
            {show(tens * 10 + ones)}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" className="min-h-[48px]" onClick={() => setTens((n) => n + 1)}>
              {tx('ui:storyAddTen')}
            </Button>
            <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => setOnes((n) => n + 1)}>
              {tx('ui:storyAddOne')}
            </Button>
            <Button type="button" variant="ghost" className="min-h-[48px]" onClick={reset}>
              {tx('ui:s_cef2fe093b')}
            </Button>
          </div>
        </div>
      )}

      {(action.kind === 'select' || action.kind === 'tens-ones') && (
        <Button type="button" className="min-h-[48px]" onClick={checkSelectOrTens}>
          {tx('ui:s_4b5e84be0e')}
        </Button>
      )}

      {checked && !correct && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-destructive">
            <X className="h-6 w-6" aria-hidden />
            <span className="font-semibold">{tx('ui:s_6c5571c034')}</span>
          </div>
          <Button type="button" variant="outline" className="min-h-[48px]" onClick={reset}>
            {tx('ui:s_cef2fe093b')}
          </Button>
        </div>
      )}
    </div>
  );
};

const TeachStory: React.FC<TeachStoryProps> = ({ planet, index, onReady }) => {
  const story = useMemo(() => getTeachStory(planet, index), [planet, index]);
  const { prefs } = useAccessibility();
  const [phase, setPhase] = useState<'listen' | 'do'>('listen');
  const [heard, setHeard] = useState(false);
  const [done, setDone] = useState(false);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    onReady(false);
    setPhase('listen');
    setDone(false);
    setHeard(false);
  }, [planet, index, onReady]);

  useEffect(() => {
    if (done) onReady(true);
  }, [done, onReady]);

  const spoken = [
    tx(story.titleKey),
    ...story.narrations.map((line) => tx(line.key, line.values)),
    tx(story.action.promptKey, story.action.promptValues),
  ].join(' ');

  const replay = () => {
    setEpoch((n) => n + 1);
    setPhase('listen');
    setDone(false);
    setHeard(false);
    onReady(false);
  };

  return (
    <div className="flex w-full max-w-lg flex-col items-center justify-center gap-4 px-2 py-4 text-center mx-auto">
      <h2 className="text-2xl font-semibold text-foreground">{tx(story.titleKey)}</h2>

      <div className="flex items-center gap-2">
        <ReadAloudButton
          key={`${planet}-${index}-${epoch}`}
          text={spoken}
          autoPlay
          onPlayed={() => setHeard(true)}
        />
        <span className="text-xs sm:text-sm text-muted-foreground">
          {heard ? tx('ui:hearTapAgain') : tx('ui:hearTap')}
        </span>
      </div>

      {phase === 'listen' && (
        <>
          <div
            className="w-full rounded-2xl border border-border bg-card p-4 text-start space-y-3"
            aria-live="polite"
          >
            {story.narrations.map((line) => (
              <p key={line.key} className="text-base sm:text-lg text-foreground leading-relaxed">
                {tx(line.key, line.values)}
              </p>
            ))}
          </div>
          <Button
            type="button"
            className="min-h-[48px] w-full sm:w-auto"
            onClick={() => setPhase('do')}
          >
            {tx('ui:storyYourTurn')}
          </Button>
        </>
      )}

      {phase === 'do' && (
        <div className="w-full rounded-2xl border border-primary/30 bg-card p-4">
          <p className="mb-3 text-sm font-medium text-primary">{tx('ui:storyYourTurn')}</p>
          <ActionPlay
            key={`${planet}-${index}-${epoch}-action`}
            action={story.action}
            done={done}
            onDone={() => setDone(true)}
          />
        </div>
      )}

      {done && (
        <p className="text-base text-muted-foreground">{tx(story.rememberKey)}</p>
      )}

      <Button type="button" variant="outline" className="min-h-[48px]" onClick={replay}>
        {tx('ui:storyReplay')}
      </Button>

      {/* Reduced-motion / stuck escape: never block forever */}
      {phase === 'do' && !done && prefs.reduceMotion && (
        <Button type="button" variant="ghost" className="min-h-[48px]" onClick={() => setDone(true)}>
          {tx('ui:storyReady')}
        </Button>
      )}
    </div>
  );
};

export default TeachStory;
