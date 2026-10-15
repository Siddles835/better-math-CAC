/** Mirror pairs the digit model can confuse when a stroke starts in the wrong quadrant. */
const MIRROR: Record<number, number> = { 2: 5, 5: 2, 6: 9, 9: 6 };

/**
 * A drawing whose recognized digit equals the expected answer is correct.
 * A reversal flag only counts when the model read the mirror of the answer
 * (a 6-shape for 9, a 2-shape for 5). It must not reject the digit it already read.
 */
export const gradeDrawnAnswer = (
  digit: number,
  reversal: boolean,
  expected: number
): { correct: boolean; reversal: boolean } => {
  if (!Number.isInteger(expected) || expected > 9 || expected < 0) {
    return { correct: false, reversal: false };
  }
  const correct = digit === expected;
  const mirrored = reversal && !correct && MIRROR[digit] === expected;
  return { correct, reversal: mirrored };
};
