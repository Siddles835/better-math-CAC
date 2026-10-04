import { computeExpectedAnswer, type Operator } from './compute';
import { fisherYates, type Rng } from './rng';

/**
 * Build 4 unique non-negative MCQ options containing the correct answer exactly once.
 * Distractors never equal the answer.
 */
export const buildMcqOptions = (
  correct: number,
  rng: Rng,
  poolLo = 0,
  poolHi = 9,
  count = 4
): number[] => {
  if (correct < poolLo || correct > poolHi) {
    throw new Error(`Correct answer ${correct} outside option pool ${poolLo}-${poolHi}`);
  }
  const opts = new Set<number>([correct]);
  // Prefer nearby distractors, then fill from the pool.
  const nearby = [correct - 1, correct + 1, correct - 2, correct + 2, correct + 3, correct - 3];
  for (const n of nearby) {
    if (opts.size >= count) break;
    if (n >= poolLo && n <= poolHi && n !== correct) opts.add(n);
  }
  const pool = [];
  for (let n = poolLo; n <= poolHi; n++) {
    if (n !== correct) pool.push(n);
  }
  const shuffled = fisherYates(pool, rng);
  for (const n of shuffled) {
    if (opts.size >= count) break;
    opts.add(n);
  }
  if (opts.size < count) {
    throw new Error(`Could not build ${count} unique options for answer ${correct}`);
  }
  return fisherYates([...opts], rng);
};

/**
 * Equation-builder chips: the two operands plus distractors that cannot form a
 * different valid equation. Never includes the final answer (leaks the result).
 */
export const buildEquationChipValues = (
  num1: number,
  num2: number,
  operator: '+' | '−',
  rng: Rng
): number[] => {
  const values = [num1, num2];
  const forbidden = new Set<number>([num1, num2]);
  // Never leak the result.
  forbidden.add(computeExpectedAnswer(operator, num1, num2));

  const candidates: number[] = [];
  for (let n = 0; n <= 12; n++) {
    if (forbidden.has(n)) continue;
    // For addition, avoid a pair of chips that equal the two addends in any order
    // beyond the real ones — we only place two slots, so any two chips that are
    // exactly {num1,num2} would be accepted. Extra chips must not recreate that set.
    // Since we already have num1 and num2 once each, another chip equal to neither
    // cannot recreate the set alone. Duplicate values are already excluded.
    // For subtraction, only (num1, num2) order is accepted — still avoid the total.
    candidates.push(n);
  }
  const shuffled = fisherYates(candidates, rng);
  for (const n of shuffled) {
    if (values.length >= 4) break;
    // Avoid distractor that equals the other operand when num1===num2 (already in set).
    if (!values.includes(n)) values.push(n);
  }
  return fisherYates(values, rng);
};

export const equationAccepts = (
  v1: number,
  v2: number,
  num1: number,
  num2: number,
  operator: '+' | '−'
): boolean => {
  if (operator === '+') {
    return (v1 === num1 && v2 === num2) || (v1 === num2 && v2 === num1);
  }
  return v1 === num1 && v2 === num2;
};

/** Distractor pairs that must NOT be accepted. */
export const invalidEquationPairs = (
  chips: number[],
  num1: number,
  num2: number,
  operator: '+' | '−'
): Array<[number, number]> => {
  const bad: Array<[number, number]> = [];
  for (const a of chips) {
    for (const b of chips) {
      if (a === b && chips.filter((c) => c === a).length < 2) continue;
      if (!equationAccepts(a, b, num1, num2, operator)) {
        // Only care about pairs that look "equation-like" (non-negative).
        bad.push([a, b]);
      }
    }
  }
  return bad;
};

export type { Operator };
