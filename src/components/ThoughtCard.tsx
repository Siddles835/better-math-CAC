import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PLANET_META } from '@/lib/planets';
import { type Diagnosis } from '@/lib/cognition';

interface ThoughtCardProps {
  diagnosis: Diagnosis;
  onPractice?: () => void;
  practiceLabel?: string;
}

const ThoughtCard: React.FC<ThoughtCardProps> = ({ diagnosis, onPractice, practiceLabel }) => {
  const navigate = useNavigate();
  const planet = PLANET_META[diagnosis.nextPlanet];

  return (
    <div className="bg-card rounded-xl p-5 border border-border max-w-xl text-left w-full">
      <p className="text-xs font-medium tracking-wide text-muted-foreground mb-1">Your practice</p>
      <p className="text-lg font-semibold text-foreground mb-2">{diagnosis.kidLine}</p>
      <p className="text-sm text-muted-foreground mb-4">
        Three problems built for you
        {diagnosis.primary !== 'STEADY' ? ` · then ${planet.name} if it is unlocked` : ''}
      </p>
      <Button
        type="button"
        size="lg"
        onClick={() => (onPractice ? onPractice() : navigate('/practice'))}
      >
        {practiceLabel ?? 'Start your practice'}
      </Button>
    </div>
  );
};

export default ThoughtCard;
