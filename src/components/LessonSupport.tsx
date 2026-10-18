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
 * Planet-specific lesson summary + optional worked-example launcher.
 * Replaces the old generic banners and the progress checklist.
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
    <div className="space-y-2" data-testid="lesson-support">
      {prefs.summaryFirst ? (
        <div
          className="rounded-xl border border-border/70 bg-card/60 px-3 py-2.5"
          data-testid="lesson-summary"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('helper:summary_heading')}
          </p>
          <p className="mt-1 text-sm text-foreground">{summary}</p>
        </div>
      ) : null}

      {prefs.workedExampleFirst ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2.5"
          data-testid="lesson-worked-example-launch"
        >
          <p className="text-sm text-foreground">{t('helper:worked_example_prompt')}</p>
          <Button
            type="button"
            size="sm"
            className="min-h-11 gap-2"
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
