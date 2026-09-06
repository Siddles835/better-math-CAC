import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PLANET_META } from '@/lib/planets';
import type { Diagnosis } from '@/lib/cognition';
import { Button } from '@/components/ui/button';

interface NextFocusCardProps {
  diagnosis: Diagnosis;
  onOpen: () => void;
  canOpen?: boolean;
}

const NextFocusCard: React.FC<NextFocusCardProps> = ({ diagnosis, onOpen, canOpen = true }) => {
  const navigate = useNavigate();
  const planet = PLANET_META[diagnosis.nextPlanet];

  return (
    <div className="mt-5 mx-auto max-w-lg text-left rounded-2xl border border-border bg-card/90 p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground mb-1">Your practice</p>
      <p className="text-base font-semibold text-foreground">{diagnosis.kidLine}</p>
      <p className="text-sm text-muted-foreground mt-1 mb-3">
        Three short problems made from how you worked last time.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="lg" onClick={() => navigate('/practice')} className="min-h-[44px]">
          Start your practice
        </Button>
        {canOpen && (
          <Button type="button" variant="outline" size="lg" onClick={onOpen} className="min-h-[44px]">
            Open {planet.name}
          </Button>
        )}
      </div>
      {!canOpen && diagnosis.primary !== 'STEADY' && (
        <p className="text-sm text-muted-foreground mt-3">
          {planet.name} is still locked. Your practice does not need it.
        </p>
      )}
    </div>
  );
};

export default NextFocusCard;
