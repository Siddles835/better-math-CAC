import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DotField from '@/components/explore/DotField';
import ExploreShell from '@/components/explore/ExploreShell';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import {
  explorePromptSignature,
  generateExplorePrompt,
  loadLastPromptSignature,
  saveLastPromptSignature,
  type ExploreBand,
  type QuickLookPrompt,
} from '@/lib/explore';
import { OptionalDraw, WaysFooter, useExploreSave } from './activityHelpers';

const QuickLookActivity: React.FC<{ band: ExploreBand }> = ({ band }) => {
  const { t } = useTranslation('explore');
  const { prefs, announce } = useAccessibility();
  const { persist } = useExploreSave('quick-look');
  const [entropy, setEntropy] = useState(() => Date.now());
  const prompt = useMemo(() => {
    const prev = loadLastPromptSignature('quick-look');
    const next = generateExplorePrompt('quick-look', band, entropy, prev) as QuickLookPrompt;
    saveLastPromptSignature('quick-look', explorePromptSignature(next));
    return next;
  }, [band, entropy]);
  const [visible, setVisible] = useState(true);
  const [ways, setWays] = useState(0);
  const [drawOpen, setDrawOpen] = useState(false);
  const [chip, setChip] = useState<string | null>(null);

  useEffect(() => {
    setVisible(true);
    setChip(null);
    if (!prompt.flashMs || prefs.reduceMotion) return;
    const id = window.setTimeout(() => setVisible(false), prompt.flashMs);
    return () => window.clearTimeout(id);
  }, [prompt, prefs.reduceMotion]);

  const title = t('act_quick_look');
  const speak = t('how_see');

  return (
    <ExploreShell
      testId="explore-activity-quick-look"
      title={title}
      speakText={speak}
      footer={
        <WaysFooter
          waysFound={ways}
          onAnother={() => {
            setEntropy(Date.now());
            setWays((n) => n);
          }}
          onSave={() => persist(ways, title)}
        />
      }
    >
      <p className="text-lg">{speak}</p>
      <DotField count={prompt.dots} arrangement="dice" hidden={!visible} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11"
          onClick={() => {
            setVisible(true);
            if (prompt.flashMs && !prefs.reduceMotion) {
              window.setTimeout(() => setVisible(false), prompt.flashMs);
            }
          }}
        >
          {t('show_again')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => {
            setVisible(true);
            announce(t('dots_stay'));
          }}
        >
          {t('dots_stay')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('how_see')}>
        {['obs_groups', 'obs_pairs', 'obs_five', 'obs_rows'].map((key) => (
          <Button
            key={key}
            type="button"
            variant={chip === key ? 'default' : 'outline'}
            className="min-h-11"
            aria-pressed={chip === key}
            onClick={() => {
              setChip(key);
              setWays((n) => n + 1);
              announce(t(key));
            }}
          >
            {t(key)}
          </Button>
        ))}
      </div>
      <p className="text-sm" dir="ltr">
        {t('i_see', { n: prompt.dots })}
      </p>
      <OptionalDraw open={drawOpen} onToggle={() => setDrawOpen((v) => !v)} onRead={() => setWays((n) => n + 1)} />
    </ExploreShell>
  );
};

export default QuickLookActivity;
