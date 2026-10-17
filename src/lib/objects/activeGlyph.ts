import { loadObjectPrefs } from '@/lib/objects/prefs';
import { getObjectStore } from '@/lib/objects/store';
import type { BuiltinObjectId } from '@/lib/objects/types';
import { BUILTIN_OBJECTS } from '@/lib/objects/types';

/** Lesson / problem role used to pick a default builtin when no sticker is active. */
export type ObjectGlyphRole = 'count' | 'add' | 'subtract';

const BUILTIN_IDS = new Set<string>(BUILTIN_OBJECTS.map((item) => item.id));

export const builtinGlyphForRole = (role: ObjectGlyphRole): string =>
  role === 'count' ? 'builtin:apple' : 'builtin:pencil';

/** Normalize bare builtin names to `builtin:<id>`; leave photo ids and prefixed ids alone. */
export const normalizeGlyphId = (id: string): string => {
  if (id === 'active' || id === 'mix' || id === 'dot') return id;
  if (id.startsWith('builtin:')) {
    const bare = id.slice('builtin:'.length);
    return BUILTIN_IDS.has(bare) ? id : 'builtin:apple';
  }
  if (BUILTIN_IDS.has(id)) return `builtin:${id as BuiltinObjectId}`;
  return id;
};

export interface ResolveActiveGlyphOptions {
  role: ObjectGlyphRole;
  /** From prefs. When omitted, reads `loadObjectPrefs().activeId`. */
  activeId?: string | 'mix' | null;
  /** Enabled sticker ids (`builtin:x` or photo uuid). Required for a useful mix. */
  enabledIds?: readonly string[];
  /** Index into the mix rotation (default 0). */
  index?: number;
  /** Explicit problem visual id. `'active'` means follow prefs. */
  objectId?: string | 'active';
}

/**
 * Resolve the glyph id to pass to ObjectGlyph.
 * Order: explicit objectId (unless 'active') → prefs activeId → mix of enabled → role default.
 */
export const resolveActiveGlyphId = (options: ResolveActiveGlyphOptions): string => {
  const { role, index = 0, objectId } = options;
  if (objectId && objectId !== 'active') {
    return normalizeGlyphId(objectId);
  }

  const activeId =
    options.activeId !== undefined ? options.activeId : loadObjectPrefs().activeId;

  if (activeId && activeId !== 'mix') {
    return normalizeGlyphId(activeId);
  }

  if (activeId === 'mix') {
    const enabled = options.enabledIds ?? [];
    if (enabled.length > 0) {
      const pick = enabled[Math.abs(index) % enabled.length];
      if (pick) return normalizeGlyphId(pick);
    }
  }

  return builtinGlyphForRole(role);
};

/** Enabled sticker ids suitable for mix / ObjectGlyph. */
export const loadEnabledObjectIds = async (): Promise<string[]> => {
  const list = await getObjectStore().list();
  return list
    .filter((item) => item.enabled)
    .map((item) =>
      item.kind === 'builtin' && item.builtinId ? `builtin:${item.builtinId}` : item.id
    );
};

/** Async convenience: prefs + store, then resolve. */
export const loadActiveGlyphId = async (
  role: ObjectGlyphRole,
  index = 0,
  objectId?: string | 'active'
): Promise<string> => {
  const prefs = loadObjectPrefs();
  const needsEnabled =
    prefs.activeId === 'mix' || objectId === 'active' || objectId === undefined;
  const enabledIds = needsEnabled ? await loadEnabledObjectIds() : [];
  return resolveActiveGlyphId({
    role,
    activeId: prefs.activeId,
    enabledIds,
    index,
    objectId,
  });
};
