import { tx } from '@/i18n/tx';
import React, { useEffect, useMemo, useState } from 'react';
import PathActivity from '@/components/PathActivity';
import { drillItem, INSERTED_PLAN } from '@/lib/lessonDuration';
import type { PlanetId } from '@/lib/planets';

const visitEntropy = () => {
  const key = 'mathlift.lessonVisit';
  const existing = sessionStorage.getItem(key);
  if (existing) return Number(existing);
  const next = Date.now() % 100000;
  sessionStorage.setItem(key, String(next));
  return next;
};

interface LessonDrillProps {
  planet: PlanetId;
  index: number;
  onReady: (ready: boolean) => void;
}

const LessonDrill: React.FC<LessonDrillProps> = ({ planet, index, onReady }) => {
  const kind = INSERTED_PLAN[index] ?? 'drill';
  const [entropy] = useState(visitEntropy);
  const item = useMemo(() => drillItem(planet, index, entropy), [planet, index, entropy]);

  useEffect(() => {
    onReady(kind === 'teach' || kind === 'break');
  }, [kind, onReady, index]);

  if (kind === 'teach') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8">
        <p className="text-2xl font-medium">{tx(`ui:teach_${planet}`)}</p>
      </div>
    );
  }

  if (kind === 'break') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8">
        <h2 className="text-2xl font-semibold mb-3">{tx('ui:s_11747ba300')}</h2>
        <p className="text-muted-foreground">{tx('ui:s_ee1396f0e6')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6">
      <PathActivity
        key={`${planet}-${item.id}-${index}`}
        item={item}
        onResult={(outcome) => {
          if (outcome.correct) onReady(true);
        }}
        onTraceTap={() => undefined}
        onTraceRemove={() => undefined}
        onTraceDraw={() => undefined}
      />
    </div>
  );
};

export default LessonDrill;
