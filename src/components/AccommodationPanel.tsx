import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAccessibility } from '@/context/AccessibilityContext';
import {
  loadClassAccommodations,
  setClassNeeds,
} from '@/lib/accommodations/classDefaults';
import {
  ACCOMMODATION_FEATURES,
  ACCOMMODATION_MATRIX,
  ACCOMMODATION_NEEDS,
  applyAccommodationPreset,
  clearAccommodationNeed,
  isFeatureEnabled,
  toggleAccommodationFeature,
  type AccommodationFeatureId,
  type AccommodationNeed,
} from '@/lib/accommodations/matrix';
import { withCalmMode } from '@/lib/accessibility';

interface AccommodationPanelProps {
  classCode: string;
  /** When true, applying a preset also updates class localStorage defaults. */
  persistClassDefaults?: boolean;
}

const FEATURE_ORDER: AccommodationFeatureId[] = [
  'summaryFirst',
  'workedExampleFirst',
  'soundAsText',
  'colorSafeLabels',
  'calmBackground',
  'reduceMotion',
  'muteSounds',
  'focusMode',
  'dyslexiaFont',
  'easyReadSpacing',
  'textSizeLarge',
  'biggerButtons',
  'breaks',
  'relaxedPacing',
  'autoReadAloud',
  'slowSpeech',
  'highContrast',
];

const AccommodationPanel: React.FC<AccommodationPanelProps> = ({
  classCode,
  persistClassDefaults = true,
}) => {
  const { t } = useTranslation('teacher');
  const { prefs, replacePrefs, announce } = useAccessibility();
  const [selectedNeeds, setSelectedNeeds] = useState<AccommodationNeed[]>(() => {
    return loadClassAccommodations(classCode)?.needs ?? [];
  });
  const [note, setNote] = useState('');

  const applyNeed = (need: AccommodationNeed) => {
    // Clicking an already-selected need turns it off (especially important for low vision).
    if (selectedNeeds.includes(need)) {
      removeNeed(need);
      return;
    }
    const nextNeeds = [...selectedNeeds, need];
    setSelectedNeeds(nextNeeds);
    if (persistClassDefaults) setClassNeeds(classCode, nextNeeds);

    let next = applyAccommodationPreset(prefs, need);
    if (next.calmBackground) next = withCalmMode(next, true);
    replacePrefs(next);
    setNote(t('acc_applied', { need: t(ACCOMMODATION_MATRIX[need].labelKey) }));
    announce(t('acc_applied', { need: t(ACCOMMODATION_MATRIX[need].labelKey) }));
  };

  const removeNeed = (need: AccommodationNeed) => {
    const nextNeeds = selectedNeeds.filter((n) => n !== need);
    setSelectedNeeds(nextNeeds);
    if (persistClassDefaults) setClassNeeds(classCode, nextNeeds);
    // Every need must actually clear its prefs (not only low vision).
    replacePrefs(clearAccommodationNeed(prefs, need, nextNeeds));
    setNote(t('acc_unlocked'));
    announce(t('acc_unlocked'));
  };

  const onToggleFeature = (featureId: AccommodationFeatureId, enabled: boolean) => {
    const next = toggleAccommodationFeature(prefs, featureId, enabled);
    replacePrefs(next);
    // Keep need chips in sync when the matching feature is turned off/on.
    if (featureId === 'highContrast') {
      const nextNeeds = enabled
        ? selectedNeeds.includes('lowVision')
          ? selectedNeeds
          : [...selectedNeeds, 'lowVision' as AccommodationNeed]
        : selectedNeeds.filter((n) => n !== 'lowVision');
      setSelectedNeeds(nextNeeds);
      if (persistClassDefaults) setClassNeeds(classCode, nextNeeds);
    }
    announce(
      `${t(ACCOMMODATION_FEATURES[featureId].labelKey)} ${enabled ? t('acc_on') : t('acc_off')}`
    );
  };

  const activeExplain = useMemo(() => {
    if (selectedNeeds.length === 0) return t('acc_pick_help');
    return selectedNeeds
      .map((need) => t(ACCOMMODATION_MATRIX[need].explainKey))
      .join(' ');
  }, [selectedNeeds, t]);

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4"
      data-testid="accommodation-panel"
      aria-labelledby="acc-panel-heading"
    >
      <div>
        <h2 id="acc-panel-heading" className="text-xl font-semibold">
          {t('acc_title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('acc_lead')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('acc_no_lock')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACCOMMODATION_NEEDS.map((need) => {
          const selected = selectedNeeds.includes(need);
          return (
            <div key={need} className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                className="min-h-10"
                data-testid={`acc-need-${need}`}
                onClick={() => applyNeed(need)}
              >
                {t(ACCOMMODATION_MATRIX[need].labelKey)}
              </Button>
              {selected ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-10"
                  onClick={() => removeNeed(need)}
                  aria-label={t('acc_remove_need', { need: t(ACCOMMODATION_MATRIX[need].labelKey) })}
                >
                  {t('acc_off')}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground" data-testid="acc-explain">
        {activeExplain}
      </p>

      <div className="space-y-2">
        <h3 className="font-medium text-foreground">{t('acc_features')}</h3>
        <ul className="space-y-2 list-none p-0 m-0">
          {FEATURE_ORDER.map((featureId) => {
            const meta = ACCOMMODATION_FEATURES[featureId];
            const enabled = isFeatureEnabled(prefs, featureId);
            return (
              <li
                key={featureId}
                className="flex min-h-[48px] items-start justify-between gap-3 rounded-xl border border-border bg-background/50 p-3"
              >
                <div>
                  <p className="font-medium text-foreground">{t(meta.labelKey)}</p>
                  <p className="text-sm text-muted-foreground">{t(meta.describeKey)}</p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => onToggleFeature(featureId, checked)}
                  aria-label={t(meta.labelKey)}
                  data-testid={`acc-feature-${featureId}`}
                />
              </li>
            );
          })}
        </ul>
      </div>

      {note ? (
        <p className="text-sm text-foreground" role="status">
          {note}
        </p>
      ) : null}
    </section>
  );
};

export default AccommodationPanel;
