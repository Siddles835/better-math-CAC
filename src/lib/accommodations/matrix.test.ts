// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFS } from '@/lib/accessibility';
import {
  applyClassDefaultsToPrefs,
  clearClassAccommodations,
  loadClassAccommodations,
  setClassNeeds,
} from './classDefaults';
import {
  applyAccommodationPreset,
  isFeatureEnabled,
  toggleAccommodationFeature,
} from './matrix';

describe('accommodation matrix', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('applies presets as editable preference patches', () => {
    const next = applyAccommodationPreset(DEFAULT_PREFS, 'dyslexia');
    expect(next.dyslexiaFont).toBe(true);
    expect(next.summaryFirst).toBe(true);
    expect(next.workedExampleFirst).toBe(true);

    // Still freely toggleable — presets never lock.
    const toggled = toggleAccommodationFeature(next, 'dyslexiaFont', false);
    expect(toggled.dyslexiaFont).toBe(false);
    expect(isFeatureEnabled(toggled, 'summaryFirst')).toBe(true);
  });

  it('stores class defaults and applies them without locking', () => {
    setClassNeeds('ROOM1', ['hearing', 'anxiety']);
    const stored = loadClassAccommodations('room1');
    expect(stored?.needs).toEqual(['hearing', 'anxiety']);

    const applied = applyClassDefaultsToPrefs(DEFAULT_PREFS, 'ROOM1');
    expect(applied.soundAsText).toBe(true);
    expect(applied.calmBackground).toBe(true);
    expect(applied.breaks).toBe(true);

    const unlocked = toggleAccommodationFeature(applied, 'soundAsText', false);
    expect(unlocked.soundAsText).toBe(false);

    clearClassAccommodations('ROOM1');
    expect(loadClassAccommodations('ROOM1')).toBeNull();
  });
});
