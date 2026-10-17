import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  builtinGlyphForRole,
  normalizeGlyphId,
  resolveActiveGlyphId,
} from './activeGlyph';
import { DEFAULT_OBJECT_PREFS, saveObjectPrefs } from './prefs';

const memoryStore = new Map<string, string>();

describe('activeGlyph', () => {
  beforeEach(() => {
    memoryStore.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStore.set(key, value);
      },
      removeItem: (key: string) => {
        memoryStore.delete(key);
      },
    });
    saveObjectPrefs({ ...DEFAULT_OBJECT_PREFS });
  });

  it('defaults apple for count and pencil for add/subtract', () => {
    expect(builtinGlyphForRole('count')).toBe('builtin:apple');
    expect(builtinGlyphForRole('add')).toBe('builtin:pencil');
    expect(builtinGlyphForRole('subtract')).toBe('builtin:pencil');
    expect(resolveActiveGlyphId({ role: 'count', activeId: null })).toBe('builtin:apple');
    expect(resolveActiveGlyphId({ role: 'add', activeId: null })).toBe('builtin:pencil');
  });

  it('normalizes bare builtin ids', () => {
    expect(normalizeGlyphId('apple')).toBe('builtin:apple');
    expect(normalizeGlyphId('builtin:crayon')).toBe('builtin:crayon');
    expect(normalizeGlyphId('photo-uuid-1')).toBe('photo-uuid-1');
  });

  it('uses an explicit objectId over prefs', () => {
    expect(
      resolveActiveGlyphId({
        role: 'count',
        activeId: 'photo-a',
        objectId: 'crayon',
      })
    ).toBe('builtin:crayon');
  });

  it('follows active photo id when objectId is active', () => {
    expect(
      resolveActiveGlyphId({
        role: 'count',
        activeId: 'photo-a',
        objectId: 'active',
      })
    ).toBe('photo-a');
  });

  it('mixes enabled ids by index and falls back when empty', () => {
    expect(
      resolveActiveGlyphId({
        role: 'add',
        activeId: 'mix',
        enabledIds: ['builtin:die', 'photo-b'],
        index: 1,
      })
    ).toBe('photo-b');
    expect(
      resolveActiveGlyphId({
        role: 'subtract',
        activeId: 'mix',
        enabledIds: [],
      })
    ).toBe('builtin:pencil');
  });

  it('reads prefs when activeId option is omitted', () => {
    saveObjectPrefs({ ...DEFAULT_OBJECT_PREFS, activeId: 'builtin:block' });
    expect(resolveActiveGlyphId({ role: 'count' })).toBe('builtin:block');
  });
});
