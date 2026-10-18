import { describe, expect, it } from 'vitest';
import { normalizePathId } from './activeLearner';

describe('normalizePathId', () => {
  it('maps all and unknown ids to foundations', () => {
    expect(normalizePathId('all')).toBe('foundations');
    expect(normalizePathId(null)).toBe('foundations');
    expect(normalizePathId('not-a-path')).toBe('foundations');
  });

  it('maps every legacy topic id onto the single foundations pathway', () => {
    expect(normalizePathId('foundations')).toBe('foundations');
    expect(normalizePathId('operations')).toBe('foundations');
    expect(normalizePathId('addition')).toBe('foundations');
    expect(normalizePathId('subtraction')).toBe('foundations');
    expect(normalizePathId('multiplication')).toBe('foundations');
    expect(normalizePathId('division')).toBe('foundations');
    expect(normalizePathId('algebra')).toBe('foundations');
  });
});
