import { tx } from '@/i18n/tx';
import React, { useMemo, useRef, useState } from 'react';
import { BUILDER_TOPICS, topicLabelKey, type TopicId } from '@/content/solarSystems';
import type { Curriculum } from '@/content/types';
import { Button } from '@/components/ui/button';
import {
  buildThreeTopicCurriculum,
  type GradeBand,
  type Pace,
} from '@/lib/curriculum/threeTopicBuild';
import { PLANET_ORDER } from '@/lib/planets';
import { cn } from '@/lib/utils';

interface ThreeTopicWizardProps {
  classCode: string;
  onCancel: () => void;
  onBuilt: (curriculum: Curriculum) => void;
}

const progressMessage = (progress: number): string => {
  if (progress < 20) return tx('paths:builderReading');
  if (progress < 45) return tx('paths:builderPlanets');
  if (progress < 70) return tx('paths:builderWriting');
  if (progress < 95) return tx('paths:builderChecking');
  return tx('paths:builderReady');
};

const ThreeTopicWizard: React.FC<ThreeTopicWizardProps> = ({ classCode, onCancel, onBuilt }) => {
  const [picked, setPicked] = useState<TopicId[]>([]);
  const [grade, setGrade] = useState<GradeBand>('1');
  const [pace, setPace] = useState<Pace>('standard');
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<'pick' | 'building' | 'ready'>('pick');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Curriculum | null>(null);
  const cancelledRef = useRef(false);

  const preview = useMemo(
    () =>
      PLANET_ORDER.map((planet, index) => {
        const topic = picked[Math.floor(index / 3)];
        return {
          planet,
          label: topic ? tx(topicLabelKey(topic)) : tx('paths:builderPreviewEmpty'),
        };
      }),
    [picked]
  );

  const toggleTopic = (topic: TopicId) => {
    setError('');
    setPicked((current) => {
      if (current.includes(topic)) return current.filter((item) => item !== topic);
      if (current.length >= 3) return current;
      return [...current, topic];
    });
  };

  const build = async () => {
    if (picked.length !== 3) {
      setError(tx('paths:builderNeedThree'));
      return;
    }
    cancelledRef.current = false;
    setPhase('building');
    setProgress(0);
    const steps = [12, 28, 48, 68, 88, 100];
    for (const value of steps) {
      if (cancelledRef.current) return;
      setProgress(value);
      await new Promise((resolve) => window.setTimeout(resolve, 320));
    }
    if (cancelledRef.current) return;
    try {
      const curriculum = buildThreeTopicCurriculum({
        classCode,
        topics: picked as [TopicId, TopicId, TopicId],
        grade,
        pace,
        name: name.trim() || picked.map((topic) => tx(topicLabelKey(topic))).join(', '),
      });
      if (cancelledRef.current) return;
      setDraft(curriculum);
      setPhase('ready');
    } catch {
      setError(tx('paths:builderFail'));
      setPhase('pick');
    }
  };

  const skipBuild = () => {
    cancelledRef.current = true;
    setPhase('pick');
    setProgress(0);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid="three-topic-wizard">
      <h2 className="text-xl font-semibold mb-2">{tx('paths:builderTitle')}</h2>
      <p className="text-sm text-muted-foreground mb-4">{tx('paths:builderLead')}</p>

      {phase === 'pick' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {BUILDER_TOPICS.map((topic) => {
              const selected = picked.includes(topic);
              const order = picked.indexOf(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={cn(
                    'min-h-[48px] rounded-xl border px-3 py-2 text-sm font-medium',
                    selected
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border bg-background'
                  )}
                  aria-pressed={selected}
                >
                  {selected ? `${order + 1}. ` : ''}
                  {tx(topicLabelKey(topic))}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <label className="text-sm">
              <span className="mb-1 block font-medium">{tx('paths:builderGrade')}</span>
              <select
                className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3"
                value={grade}
                onChange={(event) => setGrade(event.target.value as GradeBand)}
              >
                <option value="K">K</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">{tx('paths:builderPace')}</span>
              <select
                className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3"
                value={pace}
                onChange={(event) => setPace(event.target.value as Pace)}
              >
                <option value="gentle">{tx('paths:builderPaceGentle')}</option>
                <option value="standard">{tx('paths:builderPaceStandard')}</option>
                <option value="challenge">{tx('paths:builderPaceChallenge')}</option>
              </select>
            </label>
          </div>

          <label className="block text-sm mb-4">
            <span className="mb-1 block font-medium">{tx('paths:builderName')}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-h-[48px] w-full rounded-xl border border-border bg-background px-3"
              placeholder={picked.map((topic) => tx(topicLabelKey(topic))).join(', ')}
            />
          </label>

          <ul className="mb-4 grid grid-cols-3 gap-2 text-xs sm:text-sm" aria-label={tx('paths:builderTitle')}>
            {preview.map((row) => (
              <li key={row.planet} className="rounded-lg border border-border px-2 py-2">
                <span className="font-medium">{tx(`ui:planet_${row.planet}`)}</span>
                <span className="block text-muted-foreground">{row.label}</span>
              </li>
            ))}
          </ul>

          {error && (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-[48px]" data-testid="builder-run" onClick={() => void build()}>
              {tx('paths:builderBuild')}
            </Button>
            <Button type="button" variant="ghost" className="min-h-[48px]" onClick={onCancel}>
              {tx('objects:cancel')}
            </Button>
          </div>
        </>
      )}

      {phase === 'building' && (
        <div aria-live="polite" className="space-y-3">
          <p className="font-medium">{progressMessage(progress)}</p>
          <div className="h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full bg-primary transition-all motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <Button type="button" variant="ghost" className="min-h-[48px]" onClick={skipBuild}>
            {tx('paths:builderSkip')}
          </Button>
        </div>
      )}

      {phase === 'ready' && draft && (
        <div className="space-y-3" aria-live="polite">
          <p className="font-medium">{tx('paths:builderReady')}</p>
          <p className="text-sm text-muted-foreground">{draft.name}</p>
          <Button
            type="button"
            className="min-h-[48px]"
            data-testid="builder-review"
            onClick={() => onBuilt(draft)}
          >
            {tx('paths:builderReview')}
          </Button>
        </div>
      )}
    </section>
  );
};

export default ThreeTopicWizard;
