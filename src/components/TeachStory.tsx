import { tx } from '@/i18n/tx';
import React, { useEffect, useMemo, useState } from 'react';
import { AppleShape } from '@/components/AppleShape';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import { formatNumberDisplay } from '@/lib/i18n/language';
import { getTeachStory, type StoryLine, type StoryVisual } from '@/lib/teachStories';
import type { PlanetId } from '@/lib/planets';

interface TeachStoryProps {
  planet: PlanetId;
  index: 0 | 1;
  onReady: (ready: boolean) => void;
}

const PencilMark: React.FC<{ dimmed?: boolean; added?: boolean }> = ({ dimmed, added }) => (
  <svg
    viewBox="0 0 20 60"
    className={`h-12 w-4 ${dimmed ? 'opacity-30 grayscale' : ''} ${added ? 'ring-2 ring-success/50 rounded-sm' : ''}`}
    aria-hidden
  >
    <polygon points="10,60 5,48 15,48" fill="hsl(var(--foreground))" opacity="0.8" />
    <rect x="5" y="10" width="10" height="38" fill="hsl(var(--pencil))" />
    <rect x="5" y="20" width="10" height="4" fill="hsl(var(--background))" opacity="0.3" />
    <rect x="5" y="0" width="10" height="10" fill="hsl(var(--apple))" opacity="0.7" />
    <rect x="5" y="8" width="10" height="4" fill="hsl(var(--muted-foreground))" />
  </svg>
);

const AppleMark: React.FC<{ dimmed?: boolean; added?: boolean }> = ({ dimmed, added }) => (
  <svg
    viewBox="0 0 24 24"
    className={`h-8 w-8 ${dimmed ? 'opacity-30 grayscale' : ''} ${added ? 'ring-2 ring-success/50 rounded-full' : ''}`}
    aria-hidden
  >
    <AppleShape />
  </svg>
);

const Visual: React.FC<{ visual: StoryVisual; alt: string }> = ({ visual, alt }) => {
  const { prefs } = useAccessibility();
  const show = (n: number) => formatNumberDisplay(n, prefs.numberStyle);

  if (visual.kind === 'tens-ones') {
    const tens = visual.tens ?? 0;
    const ones = visual.ones ?? 0;
    return (
      <div className="flex flex-wrap items-end justify-center gap-3" role="img" aria-label={alt}>
        {Array.from({ length: tens }, (_, i) => (
          <div key={`t${i}`} className="flex h-16 w-8 flex-col justify-end gap-0.5 rounded-md bg-primary/80 p-0.5">
            {Array.from({ length: 10 }, (_, j) => (
              <span key={j} className="h-1 grow rounded-sm bg-primary-foreground/70" />
            ))}
          </div>
        ))}
        <div className="flex flex-wrap gap-1 max-w-[7rem]">
          {Array.from({ length: ones }, (_, i) => (
            <span key={`o${i}`} className="h-4 w-4 rounded-sm bg-accent" />
          ))}
        </div>
        <span className="w-full text-center text-lg font-semibold" dir="ltr">
          {show(tens * 10 + ones)}
        </span>
      </div>
    );
  }

  const count = visual.count ?? 0;
  const crossed = visual.crossed ?? 0;
  const add = visual.add ?? 0;

  const renderItem = (key: string, dimmed: boolean, added: boolean) => {
    if (visual.kind === 'apples') return <AppleMark key={key} dimmed={dimmed} added={added} />;
    if (visual.kind === 'pencils') return <PencilMark key={key} dimmed={dimmed} added={added} />;
    const tone =
      visual.kind === 'stars' ? 'bg-accent' : visual.kind === 'blocks' ? 'bg-primary' : 'bg-secondary';
    return (
      <span
        key={key}
        className={`inline-block h-5 w-5 rounded-full ${tone} ${dimmed ? 'opacity-30 grayscale' : ''} ${added ? 'ring-2 ring-success/50' : ''}`}
      />
    );
  };

  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={alt}>
      <div className="flex flex-wrap justify-center gap-2 max-w-xs">
        {Array.from({ length: count }, (_, i) => {
          const gone = crossed > 0 && i >= count - crossed;
          return renderItem(`c-${i}`, gone, false);
        })}
        {add > 0 && Array.from({ length: add }, (_, i) => renderItem(`a-${i}`, false, true))}
      </div>
      <span className="text-lg font-semibold" dir="ltr">
        {show(count - crossed + add)}
      </span>
    </div>
  );
};

const lineText = (line: StoryLine): string => tx(line.key, line.values);

const TeachStory: React.FC<TeachStoryProps> = ({ planet, index, onReady }) => {
  const story = useMemo(() => getTeachStory(planet, index), [planet, index]);
  const { prefs } = useAccessibility();
  const reduceMotion = prefs.reduceMotion;
  const [visible, setVisible] = useState(reduceMotion ? story.lines.length : 1);
  const [heard, setHeard] = useState(false);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    onReady(false);
  }, [planet, index, onReady]);

  useEffect(() => {
    if (reduceMotion) {
      setVisible(story.lines.length);
      return;
    }
    if (visible >= story.lines.length) return;
    const id = window.setTimeout(() => setVisible((n) => Math.min(story.lines.length, n + 1)), 3000);
    return () => window.clearTimeout(id);
  }, [visible, story.lines.length, reduceMotion, epoch]);

  useEffect(() => {
    if (visible >= story.lines.length) onReady(true);
  }, [visible, story.lines.length, onReady]);

  const spoken = [
    tx(story.titleKey),
    ...story.lines.map(lineText),
    tx(story.rememberKey),
  ].join(' ');

  const replay = () => {
    setHeard(false);
    setEpoch((n) => n + 1);
    setVisible(reduceMotion ? story.lines.length : 1);
    onReady(reduceMotion);
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

      <div className="w-full space-y-3" aria-live="polite">
        {story.lines.slice(0, visible).map((line, lineIndex) => {
          const text = lineText(line);
          const count =
            (line.visual.count ?? 0) - (line.visual.crossed ?? 0) + (line.visual.add ?? 0) ||
            (line.visual.tens ?? 0) * 10 + (line.visual.ones ?? 0);
          return (
            <div
              key={`${line.key}-${epoch}`}
              className="animate-concept rounded-xl border border-border bg-card p-4"
              style={{ animationDelay: reduceMotion ? '0ms' : `${lineIndex * 80}ms` }}
            >
              <p className="mb-3 text-base sm:text-lg text-foreground text-start">{text}</p>
              <Visual visual={line.visual} alt={tx('ui:storyVisualAlt', { count })} />
            </div>
          );
        })}
      </div>

      {visible >= story.lines.length && (
        <p className="text-base text-muted-foreground">{tx(story.rememberKey)}</p>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" className="min-h-[48px]" onClick={replay}>
          {tx('ui:storyReplay')}
        </Button>
        {visible < story.lines.length && (
          <Button
            type="button"
            className="min-h-[48px]"
            onClick={() => {
              setVisible(story.lines.length);
              onReady(true);
            }}
          >
            {tx('ui:storyReady')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TeachStory;
