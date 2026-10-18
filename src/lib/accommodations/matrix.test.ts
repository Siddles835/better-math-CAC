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
  ACCOMMODATION_FEATURES,
  ACCOMMODATION_MATRIX,
  ACCOMMODATION_NEEDS,
  applyAccommodationPreset,
  clearAccommodationNeed,
  isFeatureEnabled,
  toggleAccommodationFeature,
  type AccommodationFeatureId,
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

  it('turns every need off and actually clears that need’s prefs', () => {
    for (const need of ACCOMMODATION_NEEDS) {
      const on = applyAccommodationPreset(DEFAULT_PREFS, need);
      const off = clearAccommodationNeed(on, need, []);

      for (const featureId of ACCOMMODATION_MATRIX[need].featureIds) {
        // Defaults that are already on (soundAsText, colorSafeLabels) stay on.
        const meta = ACCOMMODATION_FEATURES[featureId];
        if (meta.prefKey && DEFAULT_PREFS[meta.prefKey] === true) continue;
        if (featureId === 'soundAsText' || featureId === 'colorSafeLabels') continue;
        expect(isFeatureEnabled(off, featureId), `${need}/${featureId} should be off`).toBe(false);
      }

      if (need === 'lowVision') {
        expect(off.lowVision).toBe(false);
        expect(off.colorTheme).not.toBe('contrast');
      }
      if (need === 'hearing') {
        expect(off.voiceEnabled).toBe(true);
      }
      if (need === 'speech') {
        expect(off.speechRate).toBe('normal');
        expect(off.answerMethod).toBe('any');
      }
      if (need === 'dyslexia') {
        expect(off.dyslexiaFont).toBe(false);
        expect(off.easyReadSpacing).toBe(false);
      }
      if (need === 'adhd' || need === 'anxiety' || need === 'autism' || need === 'sensory') {
        expect(off.calmBackground).toBe(false);
      }
    }
  });

  it('keeps shared features when one of two active needs is cleared', () => {
    let prefs = applyAccommodationPreset(DEFAULT_PREFS, 'adhd');
    prefs = applyAccommodationPreset(prefs, 'anxiety');
    expect(prefs.calmBackground).toBe(true);
    expect(prefs.breaks).toBe(true);

    const afterAdhd = clearAccommodationNeed(prefs, 'adhd', ['anxiety']);
    expect(afterAdhd.calmBackground).toBe(true);
    expect(afterAdhd.breaks).toBe(true);
    expect(afterAdhd.focusMode).toBe(false);

    const afterBoth = clearAccommodationNeed(afterAdhd, 'anxiety', []);
    expect(afterBoth.calmBackground).toBe(false);
    expect(afterBoth.breaks).toBe(false);
  });

  it('turns every feature switch off when toggled', () => {
    const featureIds = Object.keys(ACCOMMODATION_FEATURES) as AccommodationFeatureId[];
    for (const featureId of featureIds) {
      const on = toggleAccommodationFeature(DEFAULT_PREFS, featureId, true);
      expect(isFeatureEnabled(on, featureId), `${featureId} on`).toBe(true);
      const off = toggleAccommodationFeature(on, featureId, false);
      expect(isFeatureEnabled(off, featureId), `${featureId} off`).toBe(false);
    }
  });
});
