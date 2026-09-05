import React from 'react';
import { PLANET_META } from '@/lib/planets';
import type { Diagnosis } from '@/lib/cognition';
import { Button } from '@/components/ui/button';

interface NextFocusCardProps {
  diagnosis: Diagnosis;
  onOpen: () => void;
  canOpen?: boolean;
}

const NextFocusCard: React.FC<NextFocusCardProps> = ({ diagnosis, onOpen, canOpen = true }) => {
  const planet = PLANET_META[diagnosis.nextPlanet];

  return (
    <div className="mt-5 mx-auto max-w-lg text-left rounded-2xl border border-border bg-card/90 p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground mb-1">
        Suggested next
      </p>
      <p className="text-base font-semibold text-foreground">{planet.name}</p>
      <p className="text-sm text-muted-foreground mt-1 mb-3">{diagnosis.kidLine}</p>
      {canOpen ? (
        <Button type="button" size="lg" onClick={onOpen} className="min-h-[44px]">
          Open {planet.name}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Your teacher has not unlocked this planet yet.
        </p>
      )}
    </div>
  );
};

export default NextFocusCard;
