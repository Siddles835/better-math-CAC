import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExploreShell from '@/components/explore/ExploreShell';
import { Button } from '@/components/ui/button';
import {
  explorePromptSignature,
  generateExplorePrompt,
  loadLastPromptSignature,
  saveLastPromptSignature,
  type BuildStoryPrompt,
  type ExploreBand,
} from '@/lib/explore';
import { WaysFooter, useExploreSave } from './activityHelpers';

const OBJECTS = ['star', 'moon', 'rocket', 'pebble'] as const;

const BuildStoryActivity: React.FC<{ band: ExploreBand }> = ({ band }) => {
  const { t } = useTranslation('explore');
  const { persist } = useExploreSave('build-story');
  const [entropy, setEntropy] = useState(() => Date.now());
  const prompt = useMemo(() => {
    const prev = loadLastPromptSignature('build-story');
    const next = generateExplorePrompt('build-story', band, entropy, prev) as BuildStoryPrompt;
    saveLastPromptSignature('build-story', explorePromptSignature(next));
    return next;
  }, [band, entropy]);
  const [objectKey, setObjectKey] = useState(prompt.objectKey);
  const [ways, setWays] = useState(0);

  React.useEffect(() => {
    setObjectKey(prompt.objectKey);
  }, [prompt.objectKey, prompt.seed]);

  const total = prompt.op === 'add' ? prompt.a + prompt.b : prompt.a - prompt.b;
  const equation =
    prompt.op === 'add' ? `${prompt.a} + ${prompt.b} = ${total}` : `${prompt.a} − ${prompt.b} = ${total}`;
  const title = t('act_build_story');
  const speak = prompt.op === 'add' ? t('story_add') : t('story_sub');

  return (
    <ExploreShell
      testId="explore-activity-build-story"
      title={title}
      speakText={speak}
      footer={
        <WaysFooter
          waysFound={ways}
          onAnother={() => {
            setEntropy(Date.now());
            setWays((n) => n + 1);
          }}
          onSave={() => persist(Math.max(1, ways), title)}
        />
      }
    >
      <p className="text-lg">{t('story_pick_objects')}</p>
      <div className="flex flex-wrap gap-2">
        {OBJECTS.map((key) => (
          <Button
            key={key}
            type="button"
            variant={objectKey === key ? 'default' : 'outline'}
            className="min-h-11"
            aria-pressed={objectKey === key}
            onClick={() => {
              setObjectKey(key);
              setWays((n) => n + 1);
            }}
          >
            {t(`story_object_${key}`)}
          </Button>
        ))}
      </div>
      <div
        className="rounded-xl border border-border/70 bg-card/30 p-4"
        aria-label={t('story_picture')}
        dir="ltr"
      >
        <p className="mb-2 text-sm font-medium">{t('story_picture')}</p>
        <p className="text-base">
          {t(`story_object_${objectKey}`)} · {prompt.a}
          {prompt.op === 'add' ? ' + ' : ' − '}
          {prompt.b}
        </p>
        <div className="mt-3 flex flex-wrap gap-1" aria-hidden>
          {Array.from({ length: Math.min(40, prompt.a) }).map((_, i) => (
            <span key={`a-${i}`} className="h-3 w-3 rounded-full bg-amber-300" />
          ))}
          <span className="mx-2 text-muted-foreground">{prompt.op === 'add' ? '+' : '−'}</span>
          {Array.from({ length: Math.min(40, prompt.b) }).map((_, i) => (
            <span key={`b-${i}`} className="h-3 w-3 rounded-full bg-sky-300" />
          ))}
        </div>
      </div>
      <p className="text-lg font-semibold" dir="ltr">
        {t('story_equation')}: {equation}
      </p>
      <p className="text-sm text-muted-foreground">{speak}</p>
    </ExploreShell>
  );
};

export default BuildStoryActivity;
