import { describe, expect, it } from 'vitest';
import { clientXToValue, numberLineTicks, snapToIncrement } from './NumberLineActivity';

describe('number line mapping', () => {
  it('always includes min and max ticks', () => {
    const ticks = numberLineTicks(0, 20);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(20);
    expect(ticks.length).toBeGreaterThan(2);
  });

  it('snaps and clamps values', () => {
    expect(snapToIncrement(7.4, 0, 20, 1)).toBe(7);
    expect(snapToIncrement(-3, 0, 20, 1)).toBe(0);
    expect(snapToIncrement(99, 0, 20, 5)).toBe(20);
    expect(snapToIncrement(12, 0, 20, 5)).toBe(10);
  });

  it('maps pointer X into the numeric range', () => {
    expect(clientXToValue(0, 0, 200, 0, 20, 1)).toBe(0);
    expect(clientXToValue(100, 0, 200, 0, 20, 1)).toBe(10);
    expect(clientXToValue(200, 0, 200, 0, 20, 1)).toBe(20);
    expect(clientXToValue(250, 0, 200, 0, 20, 5)).toBe(20);
  });
});
