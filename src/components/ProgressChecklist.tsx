import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';
import {
  buildChecklistState,
  syncChecklistWithPlanetStep,
} from '@/lib/checklist/progressChecklist';
import type { PlanetId } from '@/lib/planets';
import { getActiveStudent } from '@/lib/session';
import { cn } from '@/lib/utils';

interface ProgressChecklistProps {
  planet: PlanetId;
  totalSteps: number;
  step: number;
  compact?: boolean;
  className?: string;
}

const ProgressChecklist: React.FC<ProgressChecklistProps> = ({
  planet,
  totalSteps,
  step,
  compact = true,
  className,
}) => {
  const { t } = useTranslation('helper');
  const { prefs, announce } = useAccessibility();
  const student = getActiveStudent();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [celebrate, setCelebrate] = useState(false);
  const reduceMotion = prefs.reduceMotion || prefs.calmBackground;

  useEffect(() => {
    if (!student) {
      setCompletedIds([]);
      return;
    }
    const next = syncChecklistWithPlanetStep(
      student.classCode,
      student.nickname,
      planet,
      step,
      totalSteps
    );
    setCompletedIds((prev) => {
      if (next.length > prev.length) {
        setCelebrate(true);
        if (!prefs.muteSounds) announce(t('checklist_celebrate'));
        else if (prefs.soundAsText) announce(t('checklist_celebrate'));
      }
      return next;
    });
  }, [announce, planet, prefs.muteSounds, prefs.soundAsText, step, student, t, totalSteps]);

  useEffect(() => {
    if (!celebrate) return;
    const ms = reduceMotion ? 1200 : 2200;
    const timer = window.setTimeout(() => setCelebrate(false), ms);
    return () => window.clearTimeout(timer);
  }, [celebrate, reduceMotion]);

  const state = useMemo(
    () => buildChecklistState(planet, totalSteps, step, completedIds),
    [completedIds, planet, step, totalSteps]
  );

  if (!student || totalSteps <= 0) return null;

  return (
    <aside
      className={cn(
        'rounded-xl border border-border/70 bg-card/40 px-3 py-2 text-sm',
        compact && 'max-w-md',
        className
      )}
      data-testid="progress-checklist"
      aria-label={t('checklist_title')}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-medium text-foreground">{t('checklist_title')}</p>
        <p className="text-xs text-muted-foreground">
          {t('checklist_step_of', { step: step + 1, total: totalSteps })}
        </p>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        {t('checklist_objective')}: {t('checklist_step', { n: step + 1 })}
      </p>
      <ol className={cn('flex flex-wrap gap-1.5', !compact && 'flex-col')}>
        {state.steps.map((item) => (
          <li key={item.id}>
            <span
              className={cn(
                'inline-flex min-h-8 items-center gap-1 rounded-lg border px-2 py-1 text-xs',
                item.status === 'completed' && 'border-emerald-500/50 bg-emerald-500/10 text-foreground',
                item.status === 'current' && 'border-primary bg-primary/10 font-semibold text-foreground',
                item.status === 'upcoming' && 'border-border text-muted-foreground'
              )}
            >
              {item.status === 'completed' ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : null}
              <span className="sr-only">
                {item.status === 'completed'
                  ? t('checklist_done')
                  : item.status === 'current'
                    ? t('checklist_current')
                    : t('checklist_upcoming')}
              </span>
              {t('checklist_step', { n: item.index + 1 })}
            </span>
          </li>
        ))}
      </ol>
      {celebrate ? (
        <p
          className={cn(
            'mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300',
            !reduceMotion && 'animate-fade-in'
          )}
          role="status"
        >
          {t('checklist_celebrate')}
        </p>
      ) : null}
    </aside>
  );
};

export default ProgressChecklist;
