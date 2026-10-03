import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';

/** Optional break if the user wants to, nothing is timed and no progress is lost */
const BreakCard: React.FC = () => {
  const { prefs, announce } = useAccessibility();
  const [resting, setResting] = useState(false);

  if (!prefs.breaks) return null;

  if (resting) {
    return (
      <div role="dialog" aria-modal="false" aria-label="Break"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <h2 className="text-2xl font-semibold">Break time</h2>
        <p className="max-w-sm text-muted-foreground">
          Your place is saved. Come back whenever you are ready — nothing is timed.
        </p>
        <Button type="button" className="min-h-[56px] px-8"
          onClick={() => { setResting(false); announce('Back to the lesson'); }}>
          I am ready
        </Button>
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" className="min-h-[44px]"
      onClick={() => { setResting(true); announce('Break started'); }}>
      Take a break
    </Button>
  );
};

export default BreakCard;
