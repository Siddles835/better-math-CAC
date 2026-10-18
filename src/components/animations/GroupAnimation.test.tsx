// @vitest-environment jsdom
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFS } from '@/lib/accessibility';
import GroupAnimation from './GroupAnimation';
import { addPhaseCounts, computeGroupTotal } from './groupAnimationMath';

vi.mock('@/lib/speech', () => ({
  speak: vi.fn(),
  stopSpeaking: vi.fn(),
}));

vi.mock('@/context/AccessibilityContext', () => ({
  useAccessibility: () => ({
    prefs: { ...DEFAULT_PREFS, reduceMotion: true, muteSounds: true },
    setPref: () => undefined,
    resetPrefs: () => undefined,
    patchPrefs: () => undefined,
    replacePrefs: () => undefined,
    announce: () => undefined,
  }),
}));

describe('computeGroupTotal / addPhaseCounts', () => {
  it('returns correct add totals and per-step counts', () => {
    expect(computeGroupTotal('add', 3, 2)).toBe(5);
    const steps = addPhaseCounts(3, 2);
    expect(steps['show-a']).toEqual({ a: 3, b: 0, result: 0 });
    expect(steps['show-b']).toEqual({ a: 3, b: 2, result: 0 });
    expect(steps.operator).toEqual({ a: 3, b: 2, result: 0 });
    expect(steps.merge).toEqual({ a: 3, b: 2, result: 0 });
    expect(steps.result).toEqual({ a: 3, b: 2, result: 5 });
    expect(steps.done).toEqual({ a: 3, b: 2, result: 5 });
  });
});

describe('GroupAnimation add', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows correct counts through add phases with reduced motion', async () => {
    render(<GroupAnimation op="add" a={3} b={2} autoplay />);

    // show-a settles immediately under reduceMotion, then advances
    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    // show-b
    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    // operator
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    // merge
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    // result
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    const numerals = screen.getAllByText('5');
    expect(numerals.length).toBeGreaterThanOrEqual(1);
    expect(numerals.some((el) => el.getAttribute('dir') === 'ltr')).toBe(true);
    expect(computeGroupTotal('add', 3, 2)).toBe(5);
  });
});
