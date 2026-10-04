import React, { useMemo, useState } from 'react';
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
  type NumberTalkPrompt,
} from '@/lib/explore';
import { OptionalDraw, WaysFooter, useExploreSave } from './activityHelpers';

const NumberTalkActivity: React.FC<{ band: ExploreBand }> = ({ band }) => {
  const { t } = useTranslation('explore');
  const { announce } = useAccessibility();
  const { persist } = useExploreSave('number-talk');
  const [entropy, setEntropy] = useState(() => Date.now());
  const prompt = useMemo(() => {
    const prev = loadLastPromptSignature('number-talk');
    const next = generateExplorePrompt('number-talk', band, entropy, prev) as NumberTalkPrompt;
    saveLastPromptSignature('number-talk', explorePromptSignature(next));
    return next;
  }, [band, entropy]);
  const [selected, setSelected] = useState<string[]>([]);
  const [drawOpen, setDrawOpen] = useState(false);

  const title = t('act_number_talk');
  const speak = t('notice_prompt');

  return (
    <ExploreShell
      testId="explore-activity-number-talk"
      title={title}
      speakText={speak}
      footer={
        <WaysFooter
          waysFound={selected.length}
          onAnother={() => {
            setEntropy(Date.now());
            setSelected([]);
          }}
          onSave={() => persist(selected.length, title)}
        />
      }
    >
      <p className="text-lg">{speak}</p>
      <DotField
        count={prompt.total}
        arrangement={prompt.pattern === 'ten-frame' ? 'rows' : prompt.pattern}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('notice_prompt')}>
        {prompt.observationKeys.map((key) => {
          const on = selected.includes(key);
          return (
            <Button
              key={key}
              type="button"
              variant={on ? 'default' : 'outline'}
              className="min-h-11"
              aria-pressed={on}
              onClick={() => {
                setSelected((prev) => (prev.includes(key) ? prev : [...prev, key]));
                announce(t(key));
              }}
            >
              {t(key)}
            </Button>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={() => announce(t('speak_option'))}
      >
        {t('speak_option')}
      </Button>
      <OptionalDraw
        open={drawOpen}
        onToggle={() => setDrawOpen((v) => !v)}
        onRead={() => setSelected((prev) => [...prev, `draw-${prev.length}`])}
      />
    </ExploreShell>
  );
};

export default NumberTalkActivity;
