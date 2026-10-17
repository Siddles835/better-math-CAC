export type GroupOp = 'add' | 'subtract' | 'count' | 'multiply' | 'divide';

export const clampCount = (n: number) => Math.max(0, Math.min(20, Math.floor(n)));

/** Pure result count for an op (clamped like the UI). */
export const computeGroupTotal = (op: GroupOp, rawA: number, rawB = 0): number => {
  const a = clampCount(rawA);
  const b = clampCount(rawB);
  if (op === 'count') return a;
  if (op === 'add') return a + b;
  if (op === 'subtract') return Math.max(0, a - b);
  if (op === 'multiply') return Math.min(20, a * Math.max(1, b));
  return b > 0 ? Math.floor(a / b) : 0;
};

/**
 * Settled glyph/numeral counts at each add phase (after that phase finishes counting).
 * Used by unit tests and reduced-motion step checks.
 */
export const addPhaseCounts = (
  rawA: number,
  rawB: number
): Record<'show-a' | 'show-b' | 'operator' | 'merge' | 'result' | 'done', { a: number; b: number; result: number }> => {
  const a = clampCount(rawA);
  const b = clampCount(rawB);
  const total = a + b;
  return {
    'show-a': { a, b: 0, result: 0 },
    'show-b': { a, b, result: 0 },
    operator: { a, b, result: 0 },
    merge: { a, b, result: 0 },
    result: { a, b, result: total },
    done: { a, b, result: total },
  };
};
