import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExploreShell from '@/components/explore/ExploreShell';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import {
  explorePromptSignature,
  fitsSkipPattern,
  generateExplorePrompt,
  loadLastPromptSignature,
  patternBrokenValue,
  patternExpectedNext,
  saveLastPromptSignature,
  type ExploreBand,
  type PatternSkipPrompt,
} from '@/lib/explore';
import { WaysFooter, useExploreSave } from './activityHelpers';

const PatternSkipActivity: React.FC<{ band: ExploreBand }> = ({ band }) => {
  const { t } = useTranslation('explore');
  const { announce } = useAccessibility();
  const { persist } = useExploreSave('pattern-skip');
  const [entropy, setEntropy] = useState(() => Date.now());
  const prompt = useMemo(() => {
    const prev = loadLastPromptSignature('pattern-skip');
    const next = generateExplorePrompt('pattern-skip', band, entropy, prev) as PatternSkipPrompt;
    saveLastPromptSignature('pattern-skip', explorePromptSignature(next));
    return next;
  }, [band, entropy]);
  const [ways, setWays] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const choices = useMemo(() => {
    if (prompt.mode === 'extend') {
      const next = patternExpectedNext(prompt);
      return [next, next + 1, next + prompt.step, Math.max(0, next - prompt.step)].sort(
        (a, b) => a - b
      );
    }
    const broken = patternBrokenValue(prompt);
    const correct = prompt.start + prompt.breakIndex * prompt.step;
    return Array.from(new Set([broken ?? correct, correct, correct + prompt.step, prompt.sequence[0]])).sort(
      (a, b) => (a ?? 0) - (b ?? 0)
    ) as number[];
  }, [prompt]);

  const title = t('act_pattern_skip');
  const speak = prompt.mode === 'extend' ? t('pattern_extend') : t('pattern_fix');

  return (
    <ExploreShell
      testId="explore-activity-pattern-skip"
      title={title}
      speakText={speak}
      footer={
        <WaysFooter
          waysFound={ways}
          onAnother={() => {
            setEntropy(Date.now());
            setPicked(null);
          }}
          onSave={() => persist(ways, title)}
        />
      }
    >
      <p className="text-lg">{speak}</p>
      <p className="text-sm" dir="ltr">
        {t('pattern_step', { step: prompt.step })}
      </p>
      <p className="text-xl font-semibold tracking-wide" dir="ltr" aria-label={prompt.sequence.join(' ')}>
        {prompt.sequence.join(' · ')}
        {prompt.mode === 'extend' ? ' · ?' : ''}
      </p>
      <p className="text-sm font-medium">{t('pattern_choose')}</p>
      <div className="flex flex-wrap gap-2" dir="ltr">
        {choices.map((value) => (
          <Button
            key={value}
            type="button"
            variant={picked === value ? 'default' : 'outline'}
            className="min-h-11"
            aria-pressed={picked === value}
            onClick={() => {
              setPicked(value);
              const ok =
                prompt.mode === 'extend'
                  ? value === patternExpectedNext(prompt)
                  : value === patternBrokenValue(prompt) ||
                    !fitsSkipPattern(prompt, prompt.breakIndex, prompt.sequence[prompt.breakIndex]);
              // Celebrate thinking; do not punish. Still nudge gently.
              setWays((n) => n + 1);
              announce(ok ? t('pattern_good') : t('pattern_try'));
            }}
          >
            {value}
          </Button>
        ))}
      </div>
    </ExploreShell>
  );
};

export default PatternSkipActivity;
