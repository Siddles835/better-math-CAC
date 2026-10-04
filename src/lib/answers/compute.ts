export type Operator = 'count' | '+' | '−';

/** Single source of truth: expected answer from operands + operator. */
export const computeExpectedAnswer = (
  operator: Operator,
  num1: number,
  num2 = 0
): number => {
  if (operator === 'count') return num1;
  if (operator === '+') return num1 + num2;
  return num1 - num2;
};

export const assertNonNegativeResult = (operator: Operator, num1: number, num2: number): void => {
  if (operator === '−' && num1 - num2 < 0) {
    throw new Error(`Subtraction would be negative: ${num1} − ${num2}`);
  }
};

export const inRange = (value: number, lo: number, hi: number): boolean =>
  Number.isInteger(value) && value >= lo && value <= hi;
