import { describe, expect, it } from 'vitest';
import { normalizePathId } from './activeLearner';

describe('normalizePathId', () => {
  it('maps all and unknown ids to foundations', () => {
    expect(normalizePathId('all')).toBe('foundations');
    expect(normalizePathId(null)).toBe('foundations');
    expect(normalizePathId('not-a-path')).toBe('foundations');
  });

  it('keeps real path ids', () => {
    expect(normalizePathId('foundations')).toBe('foundations');
    expect(normalizePathId('algebra')).toBe('algebra');
    expect(normalizePathId('addition')).toBe('addition');
  });
});
