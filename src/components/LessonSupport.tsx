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
 * Compact blue-space lesson aids (summary + worked example).
 * Keeps accommodation toggles; avoids the heavy stacked “form card” layout.
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
      className="mb-1 rounded-2xl border border-primary/25 bg-primary/10 px-3 py-2.5 backdrop-blur-sm"
      data-testid="lesson-support"
    >
      {prefs.summaryFirst ? (
        <div data-testid="lesson-summary">
          <p className="text-xs font-semibold tracking-wide text-primary">
            {t('helper:summary_heading')}
          </p>
          <p className="mt-0.5 text-sm text-foreground/95">{summary}</p>
        </div>
      ) : null}

      {prefs.workedExampleFirst ? (
        <div
          className={
            prefs.summaryFirst
              ? 'mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-primary/20 pt-2'
              : 'flex flex-wrap items-center justify-between gap-2'
          }
          data-testid="lesson-worked-example-launch"
        >
          <p className="text-sm text-foreground/90">{t('helper:worked_example_prompt')}</p>
          <Button
            type="button"
            size="sm"
            className="min-h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setOpenExample(true)}
            data-testid="watch-worked-example"
          >
            <Play className="h-4 w-4" aria-hidden />
            {t('helper:worked_example_watch')}
          </Button>
        </div>
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
