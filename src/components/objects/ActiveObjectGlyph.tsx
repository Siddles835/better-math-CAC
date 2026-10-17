import React, { useEffect, useState } from 'react';
import ObjectGlyph, { type ObjectGlyphProps } from '@/components/objects/ObjectGlyph';
import {
  loadEnabledObjectIds,
  resolveActiveGlyphId,
  type ObjectGlyphRole,
} from '@/lib/objects/activeGlyph';
import { loadObjectPrefs } from '@/lib/objects/prefs';

export interface ActiveObjectGlyphProps extends Omit<ObjectGlyphProps, 'objectId'> {
  role: ObjectGlyphRole;
  /** Mix rotation index when prefs.activeId is 'mix'. */
  index?: number;
}

/**
 * ObjectGlyph bound to the learner's active My Objects sticker (or role default).
 */
const ActiveObjectGlyph: React.FC<ActiveObjectGlyphProps> = ({
  role,
  index = 0,
  ...rest
}) => {
  const [objectId, setObjectId] = useState(() =>
    resolveActiveGlyphId({ role, activeId: loadObjectPrefs().activeId, index })
  );

  useEffect(() => {
    let cancelled = false;
    const prefs = loadObjectPrefs();
    void loadEnabledObjectIds().then((enabledIds) => {
      if (cancelled) return;
      setObjectId(
        resolveActiveGlyphId({
          role,
          activeId: prefs.activeId,
          enabledIds,
          index,
        })
      );
    });
    return () => {
      cancelled = true;
    };
  }, [role, index]);

  return <ObjectGlyph objectId={objectId} {...rest} />;
};

export default ActiveObjectGlyph;
