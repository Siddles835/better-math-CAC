import type { Problem } from '@/content/types';
import { tx } from '@/i18n/tx';

const NUMBER_RE = /\d+/g;

/** Turn geometry object ids (frame, pizza, …) into localized everyday names. */
const withResolvedValues = (
  values?: Record<string, string | number>
): Record<string, string | number> | undefined => {
  if (!values) return undefined;
  const next: Record<string, string | number> = { ...values };
  if (typeof next.object === 'string' && /^[a-z_]+$/i.test(next.object)) {
    const objectKey = `paths:geo_object_${next.object}`;
    const labeled = tx(objectKey);
    if (labeled && labeled !== objectKey) next.object = labeled;
  }
  return next;
};

const fillPlaceholders = (
  text: string,
  values?: Record<string, string | number>
): string => {
  let out = text;
  if (values) {
    for (const [name, value] of Object.entries(values)) {
      out = out.split(`{{${name}}}`).join(String(value));
    }
  }
  // Never show unresolved mustache tokens in the UI.
  return out.replace(/\{\{[^{}]+\}\}/g, '').replace(/\s{2,}/g, ' ').trim();
};

/**
 * Resolve a paths/ui string and fill {{placeholders}}.
 * Always strips leftover {{a}} style tokens so kids never see raw template text.
 */
export const formatPathText = (
  key: string | undefined,
  values?: Record<string, string | number>,
  fallback = ''
): string => {
  if (!key) return fallback;
  const normalizedKey =
    key.startsWith('paths:') || key.startsWith('ui:') || key.startsWith('explore:')
      ? key
      : `paths:${key}`;
  const resolved = withResolvedValues(values);
  let text = tx(normalizedKey, resolved);
  // If i18n returned the key itself, try a manual template from English patterns.
  if (!text || text === normalizedKey || text === key) {
    text = fallback || key;
  }
  return fillPlaceholders(text, resolved);
};

export const formatProblemPrompt = (problem: Problem): string => {
  const resolved = withResolvedValues(problem.promptValues);
  if (problem.prompt?.trim()) {
    return fillPlaceholders(problem.prompt.trim(), resolved);
  }
  return formatPathText(problem.promptKey, problem.promptValues, problem.equation || '');
};

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
  // Ignore trailing zeros used as padding on counting operands so "count 7"
  // does not fail just because the example also carries b: 0.
  const nonzero = (values: number[]) => values.filter((n) => n !== 0);
  const fromValues = [example.promptValues?.a, example.promptValues?.b]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const exampleNums = nonzero(
    fromValues.length > 0
      ? fromValues
      : [...numbersIn(example.prompt ?? ''), ...numbersIn((example.steps ?? []).join(' '))]
  );
  const problemNums = nonzero(
    problem.operands && problem.operands.length > 0
      ? [...problem.operands]
      : [...numbersIn(problem.prompt ?? ''), ...numbersIn(problem.equation ?? '')]
  );
  if (exampleNums.length === 0) return false;
  return !exampleNums.some((n) => problemNums.includes(n));
};

export const answerParses = (answer: string): boolean => /^\d+$/.test(answer.trim());
