import { describe, expect, it } from 'vitest';
import { FOUNDATION_BANDS, bandsForScope, questionForBand } from './placementBands';

describe('questionForBand', () => {
  it('keeps dots on foundation counting items so the UI can show them', () => {
    const countBand = FOUNDATION_BANDS.find((band) => band.placementLevel === 'count10');
    expect(countBand).toBeTruthy();
    const question = questionForBand(countBand!, 0);
    expect(question.dots).toBe(question.answer);
    expect(question.dots).toBeGreaterThan(0);
    expect(question.equation).toBeUndefined();
    expect(question.choices).toContain(question.answer);
  });

  it('turns generated counting items into dots, not a spoiler numeral', () => {
    const bands = bandsForScope('all');
    const counting = bands.find((band) => band.generatorId === 'counting' && !band.placementLevel);
    if (!counting) return;
    const question = questionForBand(counting, 0);
    expect(question.dots).toBe(question.answer);
    expect(question.equation).toBeUndefined();
  });

  it('does not reuse the same counting item while unused ones remain', () => {
    const countBand = FOUNDATION_BANDS.find((band) => band.placementLevel === 'count10');
    expect(countBand).toBeTruthy();
    const used = new Set<string>();
    const seen = new Set<number>();
    for (let i = 0; i < 8; i += 1) {
      const question = questionForBand(countBand!, i, used);
      expect(used.has(question.id)).toBe(false);
      expect(seen.has(question.answer)).toBe(false);
      used.add(question.id);
      seen.add(question.answer);
    }
    expect(seen.size).toBe(8);
  });
});
