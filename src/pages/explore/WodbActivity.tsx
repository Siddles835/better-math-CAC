import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DotField from '@/components/explore/DotField';
import ExploreShell from '@/components/explore/ExploreShell';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import {
  explorePromptSignature,
  generateExplorePrompt,
  isValidWodbChoice,
  loadLastPromptSignature,
  reasonsForWodbOption,
  saveLastPromptSignature,
  type ExploreBand,
  type WodbPrompt,
} from '@/lib/explore';
import { WaysFooter, useExploreSave } from './activityHelpers';

const WodbActivity: React.FC<{ band: ExploreBand }> = ({ band }) => {
  const { t } = useTranslation('explore');
  const { announce } = useAccessibility();
  const { persist } = useExploreSave('wodb');
  const [entropy, setEntropy] = useState(() => Date.now());
  const prompt = useMemo(() => {
    const prev = loadLastPromptSignature('wodb');
    const next = generateExplorePrompt('wodb', band, entropy, prev) as WodbPrompt;
    saveLastPromptSignature('wodb', explorePromptSignature(next));
    return next;
  }, [band, entropy]);
  const [optionId, setOptionId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const ways = (optionId ? 1 : 0) + reasons.length;

  const title = t('act_wodb');
  const speak = t('pick_picture');

  return (
    <ExploreShell
      testId="explore-activity-wodb"
      title={title}
      speakText={speak}
      footer={
        <WaysFooter
          waysFound={ways}
          onAnother={() => {
            setEntropy(Date.now());
            setOptionId(null);
            setReasons([]);
          }}
          onSave={() => persist(ways, title)}
        />
      }
    >
      <p className="text-lg">{speak}</p>
      <div className="grid grid-cols-2 gap-3" role="list">
        {prompt.options.map((option, index) => {
          const selected = optionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="listitem"
              aria-pressed={selected}
              className={`rounded-xl border p-3 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
                selected ? 'border-sky-400 bg-sky-950/40' : 'border-border bg-card/20'
              }`}
              onClick={() => {
                if (!isValidWodbChoice(prompt, option.id)) return;
                setOptionId(option.id);
                setReasons([]);
                announce(t('option_label', { n: index + 1 }));
              }}
            >
              <p className="mb-2 text-sm font-medium">{t('option_label', { n: index + 1 })}</p>
              <DotField count={option.dots} arrangement={option.arrangement} />
            </button>
          );
        })}
      </div>
      {optionId ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('why_pick')}</p>
          <div className="flex flex-wrap gap-2">
            {reasonsForWodbOption(prompt, optionId).map((key) => {
              const on = reasons.includes(key);
              return (
                <Button
                  key={key}
                  type="button"
                  variant={on ? 'default' : 'outline'}
                  className="min-h-11"
                  aria-pressed={on}
                  onClick={() => {
                    setReasons((prev) => (prev.includes(key) ? prev : [...prev, key]));
                    announce(t('thanks_thinking'));
                  }}
                >
                  {t(key)}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </ExploreShell>
  );
};

export default WodbActivity;
