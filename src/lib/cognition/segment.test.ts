import { describe, expect, it } from 'vitest';
import { segmentIntoDigits } from './segment';
import type { Stroke } from './strokes';

const box = (x0: number, y0: number, x1: number, y1: number): Stroke => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

describe('segmentIntoDigits', () => {
  it('keeps overlapping strokes in one digit', () => {
    const strokes = [box(10, 10, 40, 80), box(20, 20, 35, 70)];
    const result = segmentIntoDigits(strokes);
    expect(result.tooMany).toBe(false);
    expect(result.groups).toHaveLength(1);
  });

  it('splits two reasonably spaced digits', () => {
    const strokes = [box(10, 10, 40, 90), box(70, 10, 100, 90)];
    const result = segmentIntoDigits(strokes);
    expect(result.groups).toHaveLength(2);
    expect(result.tooMany).toBe(false);
  });

  it('flags more than three separated groups', () => {
    const strokes = [
      box(0, 0, 20, 60),
      box(40, 0, 60, 60),
      box(80, 0, 100, 60),
      box(120, 0, 140, 60),
    ];
    expect(segmentIntoDigits(strokes).tooMany).toBe(true);
  });
});
