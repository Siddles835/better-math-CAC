import { describe, expect, it } from 'vitest';
import { normalizePathId } from './activeLearner';

describe('normalizePathId', () => {
  it('maps all and unknown ids to foundations', () => {
    expect(normalizePathId('all')).toBe('foundations');
    expect(normalizePathId(null)).toBe('foundations');
    expect(normalizePathId('not-a-path')).toBe('foundations');
  });

  it('maps legacy topic ids onto the two classroom pathways', () => {
    expect(normalizePathId('foundations')).toBe('foundations');
    expect(normalizePathId('operations')).toBe('operations');
    expect(normalizePathId('addition')).toBe('foundations');
    expect(normalizePathId('subtraction')).toBe('foundations');
    expect(normalizePathId('multiplication')).toBe('operations');
    expect(normalizePathId('division')).toBe('operations');
    expect(normalizePathId('algebra')).toBe('operations');
  });
});
