import { describe, expect, it } from 'vitest';
import en from '../../locales/en/ui.json';
import { buildPersonalPath, itemSignature } from './personalPath';
import type { Diagnosis, MisconceptionCode } from './types';

const diagnosis = (primary: MisconceptionCode): Diagnosis => ({
  primary,
  confidence: 0.8,
  scores: [],
  glowPlanets: [],
  nextPlanet: 'earth',
  kidLine: '',
  teacherLine: '',
  earlyWarning: null,
  updatedAt: 0,
});

const fingerprint = (path: ReturnType<typeof buildPersonalPath>) =>
  path.items.map(itemSignature).join('|');

describe('personal practice rounds', () => {
  it('gives 20 different rounds to the same student on the same day', () => {
    const seen = new Set<string>();
    for (let round = 0; round < 20; round++) {
      const path = buildPersonalPath('Ava', diagnosis('COUNT_ALL'), '2026-10-03', {
        round,
        entropy: 1000 + round,
        accuracy: 0.5,
      });
      expect(path.items).toHaveLength(6);
      const key = fingerprint(path);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('covers 1 to 100 once a child is working in the wide band', () => {
    const seen = new Set<number>();
    for (let round = 0; round < 100; round++) {
      const path = buildPersonalPath('Ava', diagnosis('STEADY'), '2026-10-03', {
        round,
        entropy: 7,
        accuracy: 1,
      });
      path.items.forEach((entry) => {
        if (entry.target >= 1 && entry.target <= 100) seen.add(entry.target);
        if (entry.digit != null && entry.digit >= 1 && entry.digit <= 100) seen.add(entry.digit);
      });
    }
    expect(seen.size).toBe(100);
  });

  it('keeps a diagnosis-shaped item in every round', () => {
    const expectKind: Partial<Record<MisconceptionCode, string>> = {
      COUNT_ALL: 'count_on',
      OVERSHOOT: 'exact_total',
      SUB_FLIP: 'take_away',
      COMMUTE: 'same_sum',
      DIGIT_REV: 'write_digit',
      WORD_GAP: 'hear_build',
      PLACE_SPLIT: 'tens_ones',
    };
    (Object.keys(expectKind) as MisconceptionCode[]).forEach((code) => {
      const path = buildPersonalPath('Ava', diagnosis(code), '2026-10-03', { round: 3, entropy: 3 });
      expect(path.items.some((entry) => entry.kind === expectKind[code])).toBe(true);
    });
  });

  it('does not put a question answer into the prompt templates', () => {
    expect(en.pathAfter).not.toContain('{{target}}');
    expect(en.pathBefore).not.toContain('{{target}}');
    expect(en.pathCompare).not.toContain('more is');
    expect(en.pathSame).not.toContain('{{target}}');
    const path = buildPersonalPath('Ava', diagnosis('COUNT_ALL'), '2026-10-03', { round: 1, entropy: 1 });
    path.items
      .filter((entry) => entry.kind === 'neighbor' || entry.kind === 'compare')
      .forEach((entry) => {
        expect(entry.prompt).not.toContain(String(entry.target));
        expect(entry.speak).not.toContain(String(entry.target));
      });
  });

  it('keeps the sample round fixed and changes it when practice starts again', () => {
    const first = fingerprint(buildPersonalPath('Sam', diagnosis('STEADY'), 'sample', { round: 0, demo: true }));
    const again = fingerprint(buildPersonalPath('Sam', diagnosis('STEADY'), 'sample', { round: 0, demo: true }));
    const next = fingerprint(buildPersonalPath('Sam', diagnosis('STEADY'), 'sample', { round: 1, demo: true }));
    expect(first).toBe(again);
    expect(next).not.toBe(first);
  });
});
