import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ObjectGlyph from '@/components/objects/ObjectGlyph';
import { loadObjectPrefs, patchObjectPrefs } from '@/lib/objects/prefs';
import type { BuiltinObjectId } from '@/lib/objects/types';
import { cn } from '@/lib/utils';

export type RepresentationPresetId = 'apples' | 'stars' | 'blocks' | 'planets';

const PRESETS: Array<{ id: RepresentationPresetId; builtinId: BuiltinObjectId; labelKey: string }> = [
  { id: 'apples', builtinId: 'apple', labelKey: 'rep_apples' },
  { id: 'stars', builtinId: 'star', labelKey: 'rep_stars' },
  { id: 'blocks', builtinId: 'block', labelKey: 'rep_blocks' },
  { id: 'planets', builtinId: 'planet', labelKey: 'rep_planets' },
];

interface RepresentationPickerProps {
  className?: string;
  onChange?: (activeId: string) => void;
}

/**
 * Quick presets for counting pictures. Sets active sticker via object prefs.
 * Does not remove or replace My Objects photo stickers.
 */
const RepresentationPicker: React.FC<RepresentationPickerProps> = ({ className, onChange }) => {
  const { t } = useTranslation('objects');
  const [activeId, setActiveId] = useState(() => loadObjectPrefs().activeId);

  const select = (builtinId: BuiltinObjectId) => {
    const next = `builtin:${builtinId}`;
    patchObjectPrefs({ activeId: next });
    setActiveId(next);
    onChange?.(next);
  };

  return (
    <section
      className={cn('space-y-2', className)}
      data-testid="representation-picker"
      aria-labelledby="rep-picker-heading"
    >
      <h2 id="rep-picker-heading" className="text-lg font-semibold text-foreground">
        {t('rep_title')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('rep_lead')}</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 list-none p-0 m-0">
        {PRESETS.map((preset) => {
          const selected = activeId === `builtin:${preset.builtinId}`;
          return (
            <li key={preset.id}>
              <button
                type="button"
                data-testid={`rep-preset-${preset.id}`}
                aria-pressed={selected}
                onClick={() => select(preset.builtinId)}
                className={cn(
                  'flex w-full min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3',
                  selected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card/30 hover:border-primary/40'
                )}
              >
                <ObjectGlyph objectId={`builtin:${preset.builtinId}`} size="lg" />
                <span className="text-sm font-medium">{t(preset.labelKey)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default RepresentationPicker;
