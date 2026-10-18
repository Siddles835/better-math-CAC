/** Mirror pairs the digit model can confuse when a stroke starts in the wrong quadrant. */
const MIRROR: Record<number, number> = { 2: 5, 5: 2, 6: 9, 9: 6};

/**
 * Grade a recognized value against the expected answer.
 * Supports single-digit and multi-digit values (0–999).
 *
 * A reversal flag only counts for single-digit answers when the model read the
 * mirror of the answer (a 6-shape for 9, a 2-shape for 5). Multi-digit values
 * compare the assembled number; reversal is never invented for multi-digit.
 */
export const gradeDrawnAnswer = (
  digit: number,
  reversal: boolean,
  expected: number
): { correct: boolean; reversal: boolean } => {
  if (!Number.isInteger(expected) || expected < 0 || expected > 999) {
    return { correct: false, reversal: false };
  }
  if (!Number.isInteger(digit) || digit < 0 || digit > 999) {
    return { correct: false, reversal: false };
  }

  const correct = digit === expected;
  if (expected > 9) {
    return { correct, reversal: false };
  }

  const mirrored = reversal && !correct && MIRROR[digit] === expected;
  return { correct, reversal: mirrored };
};
