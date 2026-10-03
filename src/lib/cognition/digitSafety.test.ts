import { describe, expect, it } from 'vitest';
import { confirmConfidence, needsConfirm } from './digitModel';
import thresholds from './models/digit_thresholds.json';
import { segmentIntoDigits } from './segment';
import { LessonTrace } from './trace';
import type { DigitRead } from './types';

const line = (x1: number, y1: number, x2: number, y2: number) => [
  { x: x1, y: y1 },
  { x: x2, y: y2 },
];

describe('digit segmentation', () => {
  it('keeps a multi-stroke 4, 5, and 7 in one group', () => {
    const four = [line(20, 10, 20, 40), line(20, 40, 50, 40), line(40, 12, 40, 78)];
    const five = [line(55, 12, 18, 12), line(18, 12, 18, 36), line(18, 36, 52, 36), line(52, 36, 48, 74)];
    const seven = [line(16, 14, 64, 14), line(64, 14, 30, 74)];
    for (const strokes of [four, five, seven]) {
      const grouped = segmentIntoDigits(strokes);
      expect(grouped.tooMany).toBe(false);
      expect(grouped.groups).toHaveLength(1);
    }
  });

  it('splits 100 into three digits and rejects four separated parts', () => {
    const digit = (offset: number) => line(offset + 10, 12, offset + 10, 70);
    const hundred = segmentIntoDigits([digit(0), digit(90), digit(180)]);
    expect(hundred.tooMany).toBe(false);
    expect(hundred.groups).toHaveLength(3);
    const extra = segmentIntoDigits([digit(0), digit(90), digit(180), digit(270)]);
    expect(extra.tooMany).toBe(true);
    expect(extra.groups).toHaveLength(4);
  });
});

describe('confirm zone', () => {
  it('does not record an unconfirmed or unreadable read as a wrong attempt', () => {
    const trace = new LessonTrace();
    const unreadable: DigitRead = {
      status: 'unreadable',
      digit: 0,
      confidence: 0.2,
      reversal: false,
      strokeCount: 1,
      startQuadrant: 1,
      reason: 'low_confidence',
    };
    trace.setDigit(unreadable, 7);
    expect(trace.events).toHaveLength(0);
    expect(trace.digit).toBeNull();

    const high = confirmConfidence();
    const mid = (thresholds.minConfidence + high) / 2;
    const unsure: DigitRead = {
      status: 'ok',
      digit: 7,
      confidence: mid,
      reversal: true,
      strokeCount: 1,
      startQuadrant: 3,
      script: 'western',
    };
    expect(needsConfirm(unsure)).toBe(high > thresholds.minConfidence);
    if (needsConfirm(unsure)) {
      expect(trace.events).toHaveLength(0);
    }
  });
});
