/** Extract Western / Eastern Arabic-Indic / Devanagari digits from locale strings. */

const EASTERN = '٠١٢٣٤٥٦٧٨٩';
const DEVANAGARI = '०१२३४५६७८९';

const EN_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const ES_WORDS: Record<string, number> = {
  cero: 0,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};

export const extractDigits = (text: string): number[] => {
  const out: number[] = [];
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') {
      out.push(Number(ch));
      continue;
    }
    const e = EASTERN.indexOf(ch);
    if (e >= 0) {
      out.push(e);
      continue;
    }
    const d = DEVANAGARI.indexOf(ch);
    if (d >= 0) out.push(d);
  }
  return out;
};

export const extractNumberWords = (text: string, locale: string): number[] => {
  const lower = text.toLowerCase();
  const map = locale.startsWith('es') ? ES_WORDS : locale.startsWith('en') ? EN_WORDS : {};
  const found: number[] = [];
  for (const [word, value] of Object.entries(map)) {
    const re = new RegExp(`(?:^|[^\\p{L}])${word}(?:$|[^\\p{L}])`, 'giu');
    if (re.test(lower)) found.push(value);
  }
  return found;
};

/**
 * For add/sub story+question text: every operand must appear as a digit (or number word).
 * Extra digits that are not operands or the expected answer are violations
 * (e.g. a stray "1" from "each take one" that is not part of the math).
 */
export const localeNumberViolations = (
  text: string,
  locale: string,
  operands: number[],
  expectedAnswer: number,
  kind: 'count' | 'addition' | 'subtraction'
): string[] => {
  const digits = extractDigits(text);
  const words = extractNumberWords(text, locale);
  const found = [...digits, ...words];
  const violations: string[] = [];

  if (kind === 'count') {
    // Counting prompts usually omit the number (it is in the picture).
    // If a digit appears, it must equal the expected count.
    for (const d of found) {
      if (d !== expectedAnswer) {
        violations.push(`${locale}: counting text has stray number ${d} (expected picture count ${expectedAnswer})`);
      }
    }
    return violations;
  }

  for (const op of operands) {
    if (!found.includes(op)) {
      violations.push(`${locale}: missing operand ${op} in "${text}"`);
    }
  }

  const allowed = new Set([...operands, expectedAnswer]);
  for (const d of found) {
    if (!allowed.has(d)) {
      violations.push(`${locale}: unexpected number ${d} in "${text}"`);
    }
  }
  return violations;
};
