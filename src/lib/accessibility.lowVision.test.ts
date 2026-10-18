/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFS,
  applyPrefsToDocument,
  resolveColorTheme,
  withLowVision,
} from '@/lib/accessibility';
import {
  applyAccommodationPreset,
  clearAccommodationNeed,
  isFeatureEnabled,
  toggleAccommodationFeature,
} from '@/lib/accommodations/matrix';

describe('low vision colour and landscape gate', () => {
  it('does not resolve contrast colours unless lowVision is on', () => {
    expect(resolveColorTheme({ ...DEFAULT_PREFS, colorTheme: 'contrast', lowVision: false })).not.toBe(
      'contrast'
    );
    expect(resolveColorTheme({ ...DEFAULT_PREFS, lowVision: true })).toBe('contrast');
  });

  it('applies document contrast and landscape only while lowVision is on', () => {
    applyPrefsToDocument({ ...DEFAULT_PREFS, colorTheme: 'contrast', lowVision: false });
    expect(document.documentElement.getAttribute('data-low-vision')).toBeNull();
    expect(document.documentElement.getAttribute('data-high-contrast')).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).not.toBe('contrast');

    applyPrefsToDocument(withLowVision(DEFAULT_PREFS, true));
    expect(document.documentElement.getAttribute('data-low-vision')).toBe('');
    expect(document.documentElement.getAttribute('data-theme')).toBe('contrast');
    expect(document.documentElement.getAttribute('data-text-size')).toBe('xlarge');
    expect(document.documentElement.getAttribute('data-big-targets')).toBe('');

    applyPrefsToDocument(withLowVision(DEFAULT_PREFS, false));
    expect(document.documentElement.getAttribute('data-low-vision')).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).not.toBe('contrast');
  });

  it('turns low-vision landscape off when the need is cleared', () => {
    const on = applyAccommodationPreset(DEFAULT_PREFS, 'lowVision');
    expect(on.lowVision).toBe(true);
    expect(isFeatureEnabled(on, 'highContrast')).toBe(true);

    const off = clearAccommodationNeed(on, 'lowVision');
    expect(off.lowVision).toBe(false);
    expect(off.colorTheme).not.toBe('contrast');
    expect(isFeatureEnabled(off, 'highContrast')).toBe(false);

    const toggled = toggleAccommodationFeature(on, 'highContrast', false);
    expect(toggled.lowVision).toBe(false);
  });

  it('other accommodation presets do not force contrast landscape', () => {
    const dyslexia = applyAccommodationPreset(DEFAULT_PREFS, 'dyslexia');
    expect(dyslexia.lowVision).toBe(false);
    expect(resolveColorTheme(dyslexia)).not.toBe('contrast');
  });
});
