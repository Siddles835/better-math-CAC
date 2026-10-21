// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFS } from '@/lib/accessibility';
import { isFeatureEnabled } from './matrix';
import {
  accommodationsForStudent,
  blankStudentAccommodations,
  decideStudentAccommodationApply,
  loadSampleStudentAccommodations,
  markStudentAccommodationApplied,
  readAppliedStamp,
  saveStudentAccommodations,
  toggleStudentFeature,
  toggleStudentNeed,
} from './studentAccommodations';

vi.mock('@/lib/classroom', () => ({
  patchStudentFields: vi.fn(async () => undefined),
}));

describe('per-student accommodations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('turns a need on and off for one record without touching another', () => {
    const ada = blankStudentAccommodations();
    const bo = blankStudentAccommodations();
    const adaOn = toggleStudentNeed(ada, 'dyslexia').record;
    expect(adaOn.needs).toEqual(['dyslexia']);
    expect(adaOn.prefs.dyslexiaFont).toBe(true);
    expect(adaOn.prefs.autoReadAloud).toBe(true);
    expect(bo.needs).toEqual([]);
    expect(bo.prefs.dyslexiaFont).toBe(false);

    const adaOff = toggleStudentNeed(adaOn, 'dyslexia').record;
    expect(adaOff.needs).toEqual([]);
    expect(adaOff.prefs.dyslexiaFont).toBe(false);
    expect(adaOff.updatedAt).toBeGreaterThan(0);
  });

  it('keeps calm mode bundled when ADHD is turned on', () => {
    const next = toggleStudentNeed(blankStudentAccommodations(), 'adhd').record;
    expect(next.prefs.calmBackground).toBe(true);
    expect(next.prefs.reduceMotion).toBe(true);
    expect(next.prefs.muteSounds).toBe(true);
    expect(next.prefs.focusMode).toBe(true);
    expect(next.prefs.breaks).toBe(true);
    expect(isFeatureEnabled(next.prefs, 'relaxedPacing')).toBe(true);
  });

  it('links the high-contrast feature switch to the low-vision need', () => {
    const on = toggleStudentFeature(blankStudentAccommodations(), 'highContrast', true);
    expect(on.needs).toContain('lowVision');
    expect(on.prefs.lowVision).toBe(true);
    expect(on.prefs.textSize).toBe('xlarge');
    const off = toggleStudentFeature(on, 'highContrast', false);
    expect(off.needs).not.toContain('lowVision');
    expect(off.prefs.lowVision).toBe(false);
    expect(off.prefs.colorTheme).not.toBe('contrast');
  });

  it('stores sample-class choices per student on this browser', async () => {
    const quiet = toggleStudentNeed(blankStudentAccommodations(), 'hearing').record;
    await saveStudentAccommodations('sample', 'quietcomet21', quiet);
    expect(loadSampleStudentAccommodations('SAMPLE', 'quietcomet21')?.needs).toEqual(['hearing']);
    expect(loadSampleStudentAccommodations('SAMPLE', 'braveotter8')).toBeNull();
    expect(accommodationsForStudent('SAMPLE', 'braveotter8', undefined).needs).toEqual([]);
    expect(accommodationsForStudent('SAMPLE', 'quietcomet21', undefined).prefs.voiceEnabled).toBe(false);
  });

  it('applies a newer teacher snapshot and leaves the same version alone', () => {
    const record = {
      needs: ['anxiety'] as const,
      prefs: { ...DEFAULT_PREFS, calmBackground: true, breaks: true },
      updatedAt: 50,
    };
    const first = decideStudentAccommodationApply('room1', 'Ada', record, null);
    expect(first?.prefs.breaks).toBe(true);
    expect(first?.appliedUpdatedAt).toBe(50);

    markStudentAccommodationApplied('ROOM1', 'ada', 50);
    expect(
      decideStudentAccommodationApply('room1', 'ada', record, readAppliedStamp())
    ).toBeNull();

    const newer = decideStudentAccommodationApply(
      'room1',
      'ada',
      { ...record, updatedAt: 80 },
      readAppliedStamp()
    );
    expect(newer?.appliedUpdatedAt).toBe(80);
  });

  it('clears applied settings when the next student has no assignment', () => {
    const applied = { classCode: 'ROOM1', studentKey: 'ada', updatedAt: 50 };
    const cleared = decideStudentAccommodationApply('ROOM1', 'bo', undefined, applied);
    expect(cleared?.prefs).toEqual(DEFAULT_PREFS);
    expect(cleared?.appliedUpdatedAt).toBe(0);

    const untouched = decideStudentAccommodationApply('ROOM1', 'bo', undefined, {
      classCode: 'ROOM1',
      studentKey: 'bo',
      updatedAt: 0,
    });
    expect(untouched).toBeNull();
  });
});
