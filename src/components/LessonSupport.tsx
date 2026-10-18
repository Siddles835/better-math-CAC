import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WorkedExamplePlayer from '@/components/WorkedExamplePlayer';
import { useAccessibility } from '@/context/AccessibilityContext';
import { topicLabelKey } from '@/lib/lesson/workedExample';
import { getPlanetLevel } from '@/lib/planetLevels';
import type { PlanetId } from '@/lib/planets';

interface LessonSupportProps {
  planet: PlanetId;
}

/**
 * Slim blue-space aid strip for summary / worked-example toggles.
 * Does not replace the classic lesson body layout.
 */
const LessonSupport: React.FC<LessonSupportProps> = ({ planet }) => {
  const { t } = useTranslation(['helper', 'ui']);
  const { prefs } = useAccessibility();
  const [openExample, setOpenExample] = useState(false);
  const level = getPlanetLevel(planet);

  if (!prefs.summaryFirst && !prefs.workedExampleFirst) return null;

  const summary = t('helper:summary_for_planet', {
    planet: t(`ui:planet_${planet}`),
    topic: t(`helper:${topicLabelKey(level.topic)}`),
    skill: t(`ui:${level.skillKey}`),
    range: t(`ui:${level.rangeKey}`),
  });

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2"
      data-testid="lesson-support"
    >
      {prefs.summaryFirst ? (
        <p className="min-w-0 flex-1 text-sm text-foreground/95" data-testid="lesson-summary">
          <span className="font-semibold text-primary">{t('helper:summary_heading')}: </span>
          {summary}
        </p>
      ) : null}

      {prefs.workedExampleFirst ? (
        <Button
          type="button"
          size="sm"
          className="min-h-10 shrink-0 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setOpenExample(true)}
          data-testid="watch-worked-example"
        >
          <Play className="h-4 w-4" aria-hidden />
          {t('helper:worked_example_watch')}
        </Button>
      ) : null}

      <WorkedExamplePlayer
        planet={planet}
        open={openExample}
        onClose={() => setOpenExample(false)}
      />
    </div>
  );
};

export default LessonSupport;
