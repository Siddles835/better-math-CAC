import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExploreShell from '@/components/explore/ExploreShell';
import TenFrame from '@/components/explore/TenFrame';
import { Button } from '@/components/ui/button';
import {
  explorePromptSignature,
  generateExplorePrompt,
  loadLastPromptSignature,
  saveLastPromptSignature,
  type ExploreBand,
  type ShowMePrompt,
} from '@/lib/explore';
import { WaysFooter, useExploreSave } from './activityHelpers';

const ShowMeActivity: React.FC<{ band: ExploreBand }> = ({ band }) => {
  const { t } = useTranslation('explore');
  const { persist } = useExploreSave('show-me');
  const [entropy, setEntropy] = useState(() => Date.now());
  const prompt = useMemo(() => {
    const prev = loadLastPromptSignature('show-me');
    const next = generateExplorePrompt('show-me', band, entropy, prev) as ShowMePrompt;
    saveLastPromptSignature('show-me', explorePromptSignature(next));
    return next;
  }, [band, entropy]);
  const [filled, setFilled] = useState(0);
  const [ways, setWays] = useState<string[]>([]);

  const recordWay = () => {
    if (filled !== prompt.target) return;
    const key = `${filled}`;
    // Many layouts: record by count + visit index so repeats of same total still count as tries
    const label = `${filled}`;
    if (!ways.includes(label) || ways.length === 0) {
      setWays((prev) => (prev.includes(key) ? [...prev, `${key}-${prev.length}`] : [...prev, key]));
    } else {
      setWays((prev) => [...prev, `${key}-${prev.length}`]);
    }
  };

  const title = t('act_show_me');
  const speak = t('show_target', { n: prompt.target });

  return (
    <ExploreShell
      testId="explore-activity-show-me"
      title={title}
      speakText={speak}
      footer={
        <WaysFooter
          waysFound={ways.length}
          onAnother={() => {
            setEntropy(Date.now());
            setFilled(0);
          }}
          onSave={() => persist(ways.length, `${title} · ${prompt.target}`)}
        />
      }
    >
      <p className="text-lg text-foreground" dir="ltr">
        {speak}
      </p>
      <div className="flex justify-center py-2">
        <TenFrame
          filled={filled}
          capacity={10}
          onCellClick={(index) => {
            if (index < filled) setFilled(index);
            else setFilled(Math.min(10, filled + 1));
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11" onClick={() => setFilled((n) => Math.min(10, n + 1))}>
          {t('add_counter')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => setFilled((n) => Math.max(0, n - 1))}
        >
          {t('remove_counter')}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => setFilled(0)}>
          {t('clear_counters')}
        </Button>
        <Button type="button" className="min-h-11" onClick={recordWay} disabled={filled !== prompt.target}>
          {t('another_way')}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite" dir="ltr">
        {t('counters_label', { count: filled })}
      </p>
      {ways.length > 0 ? (
        <p className="text-sm" dir="ltr">
          {t('ways_list')}: {ways.length}
        </p>
      ) : null}
    </ExploreShell>
  );
};

export default ShowMeActivity;
