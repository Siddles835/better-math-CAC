import React from 'react';
import { Button } from '@/components/ui/button';
import { PLANET_META } from '@/lib/planets';
import { confidenceLabel, type Diagnosis } from '@/lib/cognition';

interface ThoughtCardProps {
  diagnosis: Diagnosis;
  onPractice?: () => void;
  practiceLabel?: string;
}

const ThoughtCard: React.FC<ThoughtCardProps> = ({ diagnosis, onPractice, practiceLabel }) => {
  const planet = PLANET_META[diagnosis.nextPlanet];

  return (
    <div className="bg-card rounded-xl p-5 border border-border max-w-xl text-left w-full">
      <p className="text-xs font-medium tracking-wide text-muted-foreground mb-1">
        Next practice
      </p>
      <p className="text-lg font-semibold text-foreground mb-2">{diagnosis.kidLine}</p>
      <p className="text-sm text-muted-foreground">
        Suggested planet: {planet.name}
        {' · '}
        {confidenceLabel(diagnosis.confidence)} ({Math.round(diagnosis.confidence * 100)}%)
      </p>
      {onPractice && diagnosis.primary !== 'STEADY' && (
        <Button type="button" variant="outline" onClick={onPractice} size="lg" className="mt-4">
          {practiceLabel ?? `Open ${planet.name}`}
        </Button>
      )}
    </div>
  );
};

export default ThoughtCard;
