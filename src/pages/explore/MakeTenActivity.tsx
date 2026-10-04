import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExploreShell from '@/components/explore/ExploreShell';
import { Button } from '@/components/ui/button';
import {
  explorePromptSignature,
  generateExplorePrompt,
  isValidComposition,
  loadLastPromptSignature,
  saveLastPromptSignature,
  type ExploreBand,
  type MakeTenPrompt,
} from '@/lib/explore';
import { WaysFooter, useExploreSave } from './activityHelpers';

const MakeTenActivity: React.FC<{ band: ExploreBand }> = ({ band }) => {
  const { t } = useTranslation('explore');
  const { persist } = useExploreSave('make-ten');
  const [entropy, setEntropy] = useState(() => Date.now());
  const prompt = useMemo(() => {
    const prev = loadLastPromptSignature('make-ten');
    const next = generateExplorePrompt('make-ten', band, entropy, prev) as MakeTenPrompt;
    saveLastPromptSignature('make-ten', explorePromptSignature(next));
    return next;
  }, [band, entropy]);
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);
  const [ways, setWays] = useState<string[]>([]);

  const record = () => {
    if (!isValidComposition(prompt.goal, left, right)) return;
    const a = Math.min(left, right);
    const b = Math.max(left, right);
    const key = `${a}+${b}`;
    setWays((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const title = t('act_make_ten', { goal: prompt.goal });
  const speak = t('make_goal', { goal: prompt.goal });

  return (
    <ExploreShell
      testId="explore-activity-make-ten"
      title={title}
      speakText={speak}
      footer={
        <WaysFooter
          waysFound={ways.length}
          onAnother={() => {
            setLeft(0);
            setRight(0);
            setEntropy(Date.now());
          }}
          onSave={() => persist(ways.length, title)}
        />
      }
    >
      <p className="text-lg" dir="ltr">
        {speak}
      </p>
      <div className="grid gap-4 sm:grid-cols-2" dir="ltr">
        <div className="rounded-xl border border-border/70 p-3">
          <p className="mb-2 text-sm font-medium">{t('pair_a')}</p>
          <p className="mb-2 text-2xl font-semibold" aria-live="polite">
            {left}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11" onClick={() => setLeft((n) => n + 1)}>
              {t('add_left')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setLeft((n) => Math.max(0, n - 1))}
            >
              {t('remove_left')}
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border/70 p-3">
          <p className="mb-2 text-sm font-medium">{t('pair_b')}</p>
          <p className="mb-2 text-2xl font-semibold" aria-live="polite">
            {right}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11" onClick={() => setRight((n) => n + 1)}>
              {t('add_right')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setRight((n) => Math.max(0, n - 1))}
            >
              {t('remove_right')}
            </Button>
          </div>
        </div>
      </div>
      <Button type="button" className="min-h-11" onClick={record}>
        {t('another_way')}
      </Button>
      {ways.length > 0 ? (
        <ul className="list-disc ps-5 text-sm" dir="ltr">
          <li className="list-none -ms-5 mb-1 font-medium">{t('ways_list')}</li>
          {ways.map((way) => (
            <li key={way}>{way}</li>
          ))}
        </ul>
      ) : null}
    </ExploreShell>
  );
};

export default MakeTenActivity;
