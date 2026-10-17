import { tx } from '@/i18n/tx';
import React, { useEffect, useState } from 'react';
import ObjectGlyph from '@/components/objects/ObjectGlyph';
import {
  loadEnabledObjectIds,
  resolveActiveGlyphId,
  type ObjectGlyphRole,
} from '@/lib/objects/activeGlyph';
import { loadObjectPrefs } from '@/lib/objects/prefs';
import type { Problem } from '@/content/types';

type Visual = NonNullable<Problem['visual']>;

const roleOf = (visual: Visual): ObjectGlyphRole => visual.op ?? 'count';

/**
 * Picture groups for a problem when prefs.showPicturesWithProblems is on.
 */
const ProblemVisual: React.FC<{ visual: Visual }> = ({ visual }) => {
  const role = roleOf(visual);
  const [groupGlyphs, setGroupGlyphs] = useState<string[][]>(() =>
    visual.groups.map((count, groupIndex) => {
      let offset = visual.groups.slice(0, groupIndex).reduce((sum, n) => sum + n, 0);
      return Array.from({ length: Math.max(0, Math.min(20, count)) }, () => {
        const id = resolveActiveGlyphId({
          role,
          activeId: loadObjectPrefs().activeId,
          index: offset,
          objectId: visual.objectId,
        });
        offset += 1;
        return id;
      });
    })
  );

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const prefs = loadObjectPrefs();
      const enabledIds = await loadEnabledObjectIds();
      if (cancel) return;
      let offset = 0;
      setGroupGlyphs(
        visual.groups.map((count) =>
          Array.from({ length: Math.max(0, Math.min(20, count)) }, () => {
            const id = resolveActiveGlyphId({
              role,
              activeId: prefs.activeId,
              enabledIds,
              index: offset,
              objectId: visual.objectId,
            });
            offset += 1;
            return id;
          })
        )
      );
    })();
    return () => {
      cancel = true;
    };
  }, [visual, role]);

  const op = visual.op ?? 'count';
  const joiner =
    op === 'add' ? '+' : op === 'subtract' ? '−' : null;

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-center gap-3"
      role="img"
      aria-label={tx('objects:visualLabel')}
    >
      {groupGlyphs.map((glyphs, groupIndex) => (
        <React.Fragment key={groupIndex}>
          {groupIndex > 0 && joiner && (
            <span className="text-2xl font-semibold text-foreground" dir="ltr" aria-hidden>
              {joiner}
            </span>
          )}
          <div className="flex flex-wrap justify-center gap-1 max-w-[12rem]">
            {glyphs.map((objectId, index) => (
              <ObjectGlyph
                key={`${groupIndex}-${index}`}
                objectId={objectId}
                size="md"
                className="pointer-events-none"
              />
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default ProblemVisual;
