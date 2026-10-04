import { describe, expect, it } from 'vitest';
import {
  compositionsFor,
  explorePromptSignature,
  fitsSkipPattern,
  generateExplorePrompt,
  generateMakeTen,
  generateShowMe,
  generateWodb,
  isValidComposition,
  isValidWodbChoice,
  maxForBand,
  reasonsForWodbOption,
} from './generators';
import { EXPLORE_ACTIVITY_IDS } from './types';

describe('explore generators', () => {
  it('keeps targets inside the band range', () => {
    for (const band of ['to10', 'to20', 'to100'] as const) {
      const max = maxForBand(band);
      for (let i = 0; i < 30; i++) {
        const show = generateShowMe(band, 1000 + i);
        expect(show.target).toBeGreaterThanOrEqual(1);
        expect(show.target).toBeLessThanOrEqual(Math.min(10, max));

        const make = generateMakeTen(band, 2000 + i);
        expect([10, 20, 100]).toContain(make.goal);
        if (band === 'to10') expect(make.goal).toBe(10);
        if (band === 'to20') expect(make.goal).toBe(20);
        if (band === 'to100') expect(make.goal).toBe(100);

        const line = generateExplorePrompt('number-line', band, i);
        if (line.kind !== 'number-line') throw new Error('expected number-line');
        expect(line.max).toBe(max);
        expect(line.start).toBeGreaterThanOrEqual(line.min);
        expect(line.start).toBeLessThanOrEqual(line.max);
        expect(line.compare).toBeGreaterThanOrEqual(line.min);
        expect(line.compare).toBeLessThanOrEqual(line.max);
      }
    }
  });

  it('avoids back-to-back duplicate signatures when previous is supplied', () => {
    for (const id of EXPLORE_ACTIVITY_IDS) {
      if (id === 'make-ten') continue; // only one goal per band
      const first = generateExplorePrompt(id, 'to20', 'visit-a');
      const sig = explorePromptSignature(first);
      const second = generateExplorePrompt(id, 'to20', 'visit-a', sig);
      expect(explorePromptSignature(second)).not.toBe(sig);
    }
  });

  it('lists multiple valid make-ten compositions', () => {
    const pairs = compositionsFor(10);
    expect(pairs.length).toBeGreaterThan(1);
    for (const [a, b] of pairs) {
      expect(isValidComposition(10, a, b)).toBe(true);
    }
    expect(isValidComposition(10, 3, 7)).toBe(true);
    expect(isValidComposition(10, 3, 8)).toBe(false);
  });

  it('marks several WODB options as valid with reasons', () => {
    const prompt = generateWodb('to10', 42);
    expect(prompt.validOptionIds.length).toBe(prompt.options.length);
    expect(prompt.options.length).toBe(4);
    for (const option of prompt.options) {
      expect(isValidWodbChoice(prompt, option.id)).toBe(true);
      expect(reasonsForWodbOption(prompt, option.id).length).toBeGreaterThan(0);
    }
  });

  it('checks skip-counting pattern membership', () => {
    const prompt = generateExplorePrompt('pattern-skip', 'to20', 7);
    if (prompt.kind !== 'pattern-skip') throw new Error('expected pattern');
    expect(fitsSkipPattern(prompt, 0, prompt.start)).toBe(true);
    expect(fitsSkipPattern(prompt, 1, prompt.start + prompt.step)).toBe(true);
    expect(fitsSkipPattern(prompt, 1, prompt.start + prompt.step + 1)).toBe(false);
  });
});
