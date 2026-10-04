/**
 * Typed / pasted answer parsing for quizzes and number pads.
 * Accepts Western, Eastern Arabic-Indic, and Devanagari digits.
 * Rejects junk ("5abc"), empty, bare "-", and decimals as unreadable.
 */

const EASTERN = '٠١٢٣٤٥٦٧٨٩';
const DEVANAGARI = '०१२३४५६७८९';

export type ParseResult =
  | { status: 'ok'; value: number }
  | { status: 'unreadable'; reason: string };

const toWesternDigit = (ch: string): string | null => {
  if (ch >= '0' && ch <= '9') return ch;
  const e = EASTERN.indexOf(ch);
  if (e >= 0) return String(e);
  const d = DEVANAGARI.indexOf(ch);
  if (d >= 0) return String(d);
  return null;
};

export const parseStudentAnswer = (raw: string): ParseResult => {
  if (typeof raw !== 'string') return { status: 'unreadable', reason: 'not_string' };
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '-') {
    return { status: 'unreadable', reason: 'empty' };
  }
  if (/[.,٫]/.test(trimmed)) {
    return { status: 'unreadable', reason: 'decimal' };
  }
  let digits = '';
  for (const ch of trimmed) {
    if (ch === ' ' || ch === '\u00a0') continue;
    const d = toWesternDigit(ch);
    if (d === null) return { status: 'unreadable', reason: 'non_digit' };
    digits += d;
  }
  if (digits.length === 0) return { status: 'unreadable', reason: 'empty' };
  // Leading zeros ok ("05" → 5); whole string must be digits only (already enforced).
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value < 0) {
    return { status: 'unreadable', reason: 'invalid' };
  }
  return { status: 'ok', value };
};

/** True when the typed string should be judged (not skipped as unreadable). */
export const isJudgableTypedAnswer = (raw: string): boolean =>
  parseStudentAnswer(raw).status === 'ok';
