import type { Problem } from '@/content/types';
import { blankProblem } from '@/lib/curriculum/logic';

export interface BulkLineResult {
  line: number;
  raw: string;
  ok: boolean;
  prompt?: string;
  answer?: string;
  error?: 'blank' | 'missing-answer' | 'non-numeric' | 'too-long' | 'duplicate';
}

const EASTERN_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const DEVANAGARI_DIGITS = '०१२३४५६७८९';

const toAsciiDigits = (value: string): string =>
  value
    .split('')
    .map((ch) => {
      const e = EASTERN_DIGITS.indexOf(ch);
      if (e >= 0) return String(e);
      const d = DEVANAGARI_DIGITS.indexOf(ch);
      if (d >= 0) return String(d);
      return ch;
    })
    .join('');

/** Parse `question = answer` lines into validated bulk results. */
export const parseBulkPromptLines = (text: string): BulkLineResult[] => {
  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();
  return lines.map((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed) return { line: index + 1, raw, ok: false, error: 'blank' };
    if (trimmed.length > 280) return { line: index + 1, raw, ok: false, error: 'too-long' };
    const eq = trimmed.lastIndexOf('=');
    if (eq <= 0) return { line: index + 1, raw, ok: false, error: 'missing-answer' };
    const prompt = trimmed.slice(0, eq).trim();
    const answerRaw = toAsciiDigits(trimmed.slice(eq + 1).trim());
    if (!prompt || !answerRaw) return { line: index + 1, raw, ok: false, error: 'missing-answer' };
    if (!/^-?\d+(\.\d+)?$/.test(answerRaw)) {
      return { line: index + 1, raw, ok: false, error: 'non-numeric' };
    }
    const key = prompt.toLowerCase();
    if (seen.has(key)) return { line: index + 1, raw, ok: false, error: 'duplicate', prompt, answer: answerRaw };
    seen.add(key);
    return { line: index + 1, raw, ok: true, prompt, answer: answerRaw };
  });
};

export const bulkLinesToProblems = (results: BulkLineResult[], idPrefix: string): Problem[] => {
  const out: Problem[] = [];
  for (const row of results) {
    if (!row.ok || !row.prompt || row.answer == null) continue;
    const problem = blankProblem(`${idPrefix}-${out.length + 1}`);
    problem.prompt = row.prompt;
    problem.answer = row.answer;
    problem.hints = ['Look at the numbers.', 'Try a related fact.', 'Check your work.'];
    out.push(problem);
  }
  return out;
};
