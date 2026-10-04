import React, { useMemo, useState } from 'react';
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

const NumberLineActivity: React.FC<{ band: ExploreBand }> = ({ band }) => {
  const { t } = useTranslation('explore');
  const { announce } = useAccessibility();
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

  React.useEffect(() => {
    setPos(prompt.start);
  }, [prompt.start, prompt.seed]);

  const move = (delta: number) => {
    setPos((n) => Math.min(prompt.max, Math.max(prompt.min, n + delta)));
    setWays((n) => n + 1);
  };

  const compareKey =
    pos < prompt.compare
      ? 'line_smaller'
      : pos > prompt.compare
        ? 'line_larger'
        : 'line_same';

  const title = t('act_number_line');
  const speak = t('line_place', { n: pos });
  const pct =
    prompt.max === prompt.min ? 0 : ((pos - prompt.min) / (prompt.max - prompt.min)) * 100;

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
      <div
        className="relative my-4 h-12 rounded-full bg-slate-800/80 border border-border"
        role="slider"
        aria-valuemin={prompt.min}
        aria-valuemax={prompt.max}
        aria-valuenow={pos}
        aria-label={t('act_number_line')}
        dir="ltr"
      >
        <div
          className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11" onClick={() => move(-prompt.hop)}>
          {t('line_left')}
        </Button>
        <Button type="button" className="min-h-11" onClick={() => move(prompt.hop)}>
          {t('line_right')}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => move(-10)}>
          {t('line_jump_ten')}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => move(10)}>
          {t('line_jump_ten')}
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
