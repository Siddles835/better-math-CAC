import { tx } from '@/i18n/tx';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PLANET_META } from '@/lib/planets';
import { kidLineFor, type Diagnosis } from '@/lib/cognition';
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
    <div className="mt-5 mx-auto max-w-lg text-start rounded-2xl border border-border bg-card/90 p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground mb-1">{tx('ui:s_e6825d79e8')}</p>
      <p className="text-base font-semibold text-foreground">{kidLineFor(diagnosis.primary)}</p>
      <p className="text-sm text-muted-foreground mt-1 mb-3">{tx('ui:s_86bf587b6a')}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="lg" onClick={() => navigate('/practice')} className="min-h-[44px]">{tx('ui:s_cb6296366f')}</Button>
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
