import type { Problem } from '@/content/types';

const NUMBER_RE = /\d+/g;

export const numbersIn = (text: string): number[] =>
  [...text.matchAll(NUMBER_RE)].map((match) => Number.parseInt(match[0], 10));

/** True when a hint or feedback string contains the answer as a whole number. */
export const leaksAnswer = (texts: string[], answer: string): boolean => {
  const value = String(answer).trim();
  if (!/^\d+$/.test(value)) return false;
  const re = new RegExp(`(^|[^0-9])${value}([^0-9]|$)`);
  return texts.some((text) => re.test(text));
};

export const exampleNumbersDiffer = (problem: Problem): boolean => {
  const example = problem.workedExample;
  if (!example) return true;
  const fromValues = [example.promptValues?.a, example.promptValues?.b]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const exampleNums =
    fromValues.length > 0
      ? fromValues
      : [...numbersIn(example.prompt ?? ''), ...numbersIn((example.steps ?? []).join(' '))];
  const problemNums =
    problem.operands && problem.operands.length > 0
      ? problem.operands
      : [...numbersIn(problem.prompt ?? ''), ...numbersIn(problem.equation ?? '')];
  if (exampleNums.length === 0) return false;
  return !exampleNums.some((n) => problemNums.includes(n));
};

export const answerParses = (answer: string): boolean => /^\d+$/.test(answer.trim());
