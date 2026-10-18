import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GroupAnimation from '@/components/animations/GroupAnimation';
import { getWorkedExample, topicLabelKey } from '@/lib/lesson/workedExample';
import { getPlanetLevel } from '@/lib/planetLevels';
import type { PlanetId } from '@/lib/planets';
import { stopSpeaking } from '@/lib/speech';

interface WorkedExamplePlayerProps {
  planet: PlanetId;
  open: boolean;
  onClose: () => void;
}

/**
 * Short “video” worked example for the current planet: animated groups
 * narrated with the clear speaking voice (OpenAI TTS when configured).
 */
const WorkedExamplePlayer: React.FC<WorkedExamplePlayerProps> = ({
  planet,
  open,
  onClose,
}) => {
  const { t } = useTranslation(['helper', 'ui']);
  const example = getWorkedExample(planet);
  const level = getPlanetLevel(planet);

  useEffect(() => {
    if (!open) stopSpeaking();
    return () => stopSpeaking();
  }, [open]);

  if (!open) return null;

  const equation =
    example.op === 'count'
      ? String(example.a)
      : example.op === 'add'
        ? `${example.a} + ${example.b}`
        : `${example.a} − ${example.b}`;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-background/80 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="worked-example-title"
      data-testid="worked-example-player"
    >
      <div className="flex w-full max-w-lg flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="worked-example-title" className="text-lg font-semibold text-foreground">
              {t('helper:worked_example_title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(`ui:${level.labelKey}`)} · {t(`helper:${topicLabelKey(example.topic)}`)}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground" dir="ltr">
              {t('helper:worked_example_shows', { equation })}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 shrink-0"
            onClick={onClose}
            aria-label={t('helper:worked_example_close')}
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
        </div>

        <div
          className="overflow-hidden rounded-xl border border-primary/30 bg-background"
          data-testid="worked-example-stage"
        >
          <GroupAnimation
            key={`${planet}-${example.a}-${example.b}`}
            op={example.op}
            a={example.a}
            b={example.b}
            glyph={example.glyph}
            autoplay
            className="border-0 bg-transparent"
          />
        </div>

        <p className="text-xs text-muted-foreground">{t('helper:worked_example_voice_note')}</p>

        <div className="flex justify-end">
          <Button type="button" className="min-h-11" onClick={onClose}>
            {t('helper:worked_example_done')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkedExamplePlayer;
