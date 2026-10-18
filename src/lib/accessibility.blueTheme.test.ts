/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFS,
  applyPrefsToDocument,
  loadPrefs,
  resolveColorTheme,
  withLowVision,
} from '@/lib/accessibility';

describe('classic blue MathLift theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-low-vision');
    document.documentElement.removeAttribute('data-high-contrast');
  });

  it('defaults to dark (classic blue space), not system/cream', () => {
    expect(DEFAULT_PREFS.colorTheme).toBe('dark');
    expect(DEFAULT_PREFS.lowVision).toBe(false);
    expect(resolveColorTheme(DEFAULT_PREFS)).toBe('dark');
    applyPrefsToDocument(DEFAULT_PREFS);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-high-contrast')).toBeNull();
  });

  it('migrates stored system default to dark once and persists it', () => {
    window.localStorage.setItem(
      'mathlift.learningPrefs.v1',
      JSON.stringify({ ...DEFAULT_PREFS, colorTheme: 'system' })
    );
    const loaded = loadPrefs();
    expect(loaded.colorTheme).toBe('dark');
    expect(window.localStorage.getItem('mathlift.restoredBlueTheme.v1')).toBe('1');
    const stored = JSON.parse(window.localStorage.getItem('mathlift.learningPrefs.v1') || '{}');
    expect(stored.colorTheme).toBe('dark');

    // After migration, an explicit System choice sticks.
    window.localStorage.setItem(
      'mathlift.learningPrefs.v1',
      JSON.stringify({ ...DEFAULT_PREFS, colorTheme: 'system' })
    );
    expect(loadPrefs().colorTheme).toBe('system');
  });

  it('keeps Light as an opt-in and restores dark when leaving low vision', () => {
    applyPrefsToDocument({ ...DEFAULT_PREFS, colorTheme: 'light' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    const off = withLowVision(withLowVision(DEFAULT_PREFS, true), false);
    expect(off.colorTheme).toBe('dark');
    applyPrefsToDocument(off);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
