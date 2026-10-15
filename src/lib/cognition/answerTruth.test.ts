import { describe, expect, it } from 'vitest';
import {
  adaptPath,
  buildPersonalPath,
  expectedFor,
  itemSignature,
  type ItemOutcome,
  type PathItem,
} from './personalPath';
import type { Diagnosis, MisconceptionCode } from './types';

const CODES: MisconceptionCode[] = [
  'COUNT_ALL',
  'OVERSHOOT',
  'SUB_FLIP',
  'COMMUTE',
  'DIGIT_REV',
  'WORD_GAP',
  'PLACE_SPLIT',
  'STEADY',
];

const OUTCOMES: ItemOutcome[] = [
  { correct: false, overshoot: true, reversal: false },
  { correct: false, overshoot: false, reversal: true },
  { correct: false, overshoot: false, reversal: false },
];

const diagnosis = (primary: MisconceptionCode): Diagnosis => ({
  primary,
  confidence: 1,
  scores: [],
  glowPlanets: [],
  nextPlanet: 'sun',
  kidLine: '',
  teacherLine: '',
  earlyWarning: null,
  updatedAt: 0,
});

const assertItem = (item: PathItem) => {
  expect(item.target, `${item.kind} ${item.id}`).toBe(expectedFor(item));
  if (item.kind === 'write_digit') expect(item.digit).toBe(item.target);
  if (item.kind === 'compare') expect(item.start).not.toBe(item.add);
  if (item.kind === 'exact_total' || item.kind === 'hear_build') expect(item.add).toBe(item.target);
};

describe('personal path answer truth', () => {
  it('keeps target equal to expectedFor across seeds, recent, and adaptations', () => {
    for (let seed = 0; seed < 400; seed += 1) {
      for (const code of CODES) {
        const first = buildPersonalPath(`fuzz${seed}`, diagnosis(code), '2026-01-01', {
          demo: true,
          round: seed % 5,
          entropy: seed,
          accuracy: (seed % 100) / 100,
        });
        for (const item of first.items) assertItem(item);
        const withRecent = buildPersonalPath(`fuzz${seed}`, diagnosis(code), '2026-01-01', {
          demo: true,
          round: seed % 5,
          entropy: seed,
          accuracy: (seed % 100) / 100,
          recent: first.items.map(itemSignature),
        });
        for (const useRecent of [false, true]) {
          const path = useRecent ? withRecent : first;
          for (const item of path.items) assertItem(item);
          for (const outcome of OUTCOMES) {
            const adapted = adaptPath(path, 0, outcome);
            for (const item of adapted.items) assertItem(item);
          }
        }
      }
    }
  });
});
