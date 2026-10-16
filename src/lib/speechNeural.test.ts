import { describe, expect, it } from 'vitest';
import { normalizeForNeural } from './speechNeural';

describe('normalizeForNeural', () => {
  it('expands math the way a person would say it', () => {
    expect(normalizeForNeural('2 + 3 = ?')).toBe('what is 2 plus 3?');
    expect(normalizeForNeural('8 - 3 = ?')).toBe('what is 8 minus 3?');
    expect(normalizeForNeural('8 - 3')).toContain('minus');
    expect(normalizeForNeural('4 × 2')).toContain('times');
  });

  it('softens stiff equals wording', () => {
    expect(normalizeForNeural('5 equals 5')).toMatch(/5 is 5/i);
    expect(normalizeForNeural('What equals what?')).toMatch(/what is that/i);
  });

  it('strips emoji and collapses spaces', () => {
    expect(normalizeForNeural('⭐ Count 4 apples')).toBe('Count 4 apples');
  });
});
