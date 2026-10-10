export type Operator =
  | 'count'
  | '+'
  | '−'
  | '×'
  | '÷'
  | 'solve-add'
  | 'solve-sub'
  | 'solve-mul'
  | 'perimeter'
  | 'area'
  | 'angle';

/** Single source of truth: expected answer from operands + operator. */
export const computeExpectedAnswer = (
  operator: Operator,
  num1: number,
  num2 = 0
): number => {
  if (operator === 'count') return num1;
  if (operator === '+') return num1 + num2;
  if (operator === '−') return num1 - num2;
  if (operator === '×' || operator === 'area') return num1 * num2;
  if (operator === '÷' || operator === 'solve-mul') {
    if (num2 === 0 || num1 % num2 !== 0) {
      throw new Error(`division not exact: ${num1} / ${num2}`);
    }
    return num1 / num2;
  }
  if (operator === 'solve-add') return num1 - num2;
  if (operator === 'solve-sub') return num1 + num2;
  if (operator === 'perimeter') return 2 * (num1 + num2);
  if (operator === 'angle') return 180 - num1 - num2;
  throw new Error(`unknown operator ${operator}`);
};

export const assertNonNegativeResult = (operator: Operator, num1: number, num2: number): void => {
  if (operator === '−' && num1 - num2 < 0) {
    throw new Error(`Subtraction would be negative: ${num1} − ${num2}`);
  }
};

export const inRange = (value: number, lo: number, hi: number): boolean =>
  Number.isInteger(value) && value >= lo && value <= hi;
