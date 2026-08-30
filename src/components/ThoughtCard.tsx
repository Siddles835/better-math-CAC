import React from 'react';
import { Button } from '@/components/ui/button';
import { PLANET_META } from '@/lib/planets';
import { confidenceWords, MISCONCEPTION_LABEL, type Diagnosis } from '@/lib/cognition';

interface ThoughtCardProps {
  diagnosis: Diagnosis;
  onPractice?: () => void;
  practiceLabel?: string;
}

const ThoughtCard: React.FC<ThoughtCardProps> = ({ diagnosis, onPractice, practiceLabel }) => {
  const planet = PLANET_META[diagnosis.nextPlanet];
  const sure = confidenceWords(diagnosis.confidence);

  return (
    <div className="bg-card rounded-xl p-5 border border-border max-w-xl text-left">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
        What I noticed
      </p>
      <p className="text-lg font-semibold text-foreground mb-2">{diagnosis.kidLine}</p>
      <p className="text-sm text-muted-foreground mb-3">
        {planet.name} is glowing next
        {' · '}
        I&apos;m {sure} ({Math.round(diagnosis.confidence * 100)}%)
        {diagnosis.primary !== 'STEADY' && (
          <>
            {' · '}
            {MISCONCEPTION_LABEL[diagnosis.primary]}
          </>
        )}
      </p>
      {onPractice && diagnosis.primary !== 'STEADY' && (
        <Button type="button" variant="outline" onClick={onPractice} size="lg">
          {practiceLabel ?? `Practice on ${planet.name}`}
        </Button>
      )}
    </div>
  );
};

export default ThoughtCard;
