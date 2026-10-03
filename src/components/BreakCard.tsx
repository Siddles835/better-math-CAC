import { tx } from '@/i18n/tx';
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
      <div role="dialog" aria-modal="false" aria-label={tx('ui:s_7c9d6bf311')}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <h2 className="text-2xl font-semibold">{tx('ui:s_11747ba300')}</h2>
        <p className="max-w-sm text-muted-foreground">{tx('ui:s_ee1396f0e6')}</p>
        <Button type="button" className="min-h-[56px] px-8"
          onClick={() => { setResting(false); announce('Back to the lesson'); }}>{tx('ui:s_2112f6bbd6')}</Button>
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" className="min-h-[44px]"
      onClick={() => { setResting(true); announce('Break started'); }}>{tx('ui:s_8d607e8b9e')}</Button>
  );
};

export default BreakCard;
