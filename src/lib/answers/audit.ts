import { computeExpectedAnswer, inRange } from './compute';
import { localeNumberViolations } from './localeNumbers';
import { buildEquationChipValues, equationAccepts } from './options';
import { parseStudentAnswer } from './parse';
import { mulberry32 } from './rng';
import type { AuditableQuestion } from './quizQuestions';

export interface AuditViolation {
  id: string;
  lesson: string;
  check: string;
  detail: string;
}

export interface AuditResult {
  total: number;
  violations: AuditViolation[];
}

const ambiguousPatterns: Array<{ re: RegExp; why: string }> = [
  {
    re: /\bone each\b/i,
    why: 'Ambiguous take-away quantity ("one each" vs total taken)',
  },
  {
    re: /\bhow many more\b.*\bhow many in all\b|\bhow many in all\b.*\bhow many more\b/i,
    why: 'Mixed "how many more" and "how many in all"',
  },
  {
    re: /\btake one each\b/i,
    why: 'Ambiguous "take one each" wording',
  },
];

export const checkQuestion = (q: AuditableQuestion): AuditViolation[] => {
  const v: AuditViolation[] = [];
  const push = (check: string, detail: string) =>
    v.push({ id: q.id, lesson: q.lesson, check, detail });

  const [n1, n2 = 0] = q.operands;
  let recomputed: number;
  try {
    recomputed = computeExpectedAnswer(q.operator, n1, n2);
  } catch (err) {
    push('compute', String(err));
    return v;
  }

  if (q.operator === '−' && recomputed < 0) {
    push('non_negative', `subtraction ${n1}−${n2} is negative`);
  }
  if (q.expectedAnswer !== recomputed) {
    push(
      'expected_matches_operands',
      `expectedAnswer ${q.expectedAnswer} != recomputed ${recomputed} from ${q.operator} ${q.operands.join(',')}`
    );
  }

  if (q.options.length > 0) {
    const unique = new Set(q.options);
    if (unique.size !== q.options.length) {
      push('options_unique', `duplicate options: ${q.options.join(',')}`);
    }
    for (const opt of q.options) {
      if (opt < 0 || !Number.isInteger(opt)) {
        push('options_non_negative', `bad option ${opt}`);
      }
    }
    const correctCount = q.options.filter((o) => o === q.expectedAnswer).length;
    if (correctCount !== 1 && q.options.length >= 2) {
      push(
        'options_contain_answer_once',
        `correct ${q.expectedAnswer} appears ${correctCount} times in ${q.options.join(',')}`
      );
    }
    if (q.options.length >= 2 && !q.options.includes(q.expectedAnswer)) {
      push('options_missing_answer', `answer ${q.expectedAnswer} missing from options`);
    }
  }

  if (!inRange(q.expectedAnswer, q.range[0], q.range[1]) && q.lesson.startsWith('quiz')) {
    push('range', `answer ${q.expectedAnswer} outside ${q.range.join('..')}`);
  }

  for (const { re, why } of ambiguousPatterns) {
    if (re.test(q.shownText) || re.test(q.question)) {
      push('ambiguous_wording', why);
    }
  }

  if (q.pictureCounts.length > 0 && q.kind === 'counting') {
    const shown = q.pictureCounts.reduce((a, b) => a + b, 0);
    if (shown !== q.expectedAnswer && q.pictureCounts.length === 1) {
      // single picture count should match expected for counting
      if (q.pictureCounts[0] !== q.expectedAnswer) {
        push(
          'picture_matches_answer',
          `picture ${q.pictureCounts[0]} != answer ${q.expectedAnswer}`
        );
      }
    }
  }

  if (q.kind === 'addition' && q.pictureCounts.length === 2) {
    const sum = q.pictureCounts[0] + q.pictureCounts[1];
    if (sum !== q.expectedAnswer && q.id.includes('demo')) {
      push('picture_matches_answer', `pictures ${q.pictureCounts} sum ${sum} != ${q.expectedAnswer}`);
    }
  }

  return v;
};

export const checkLocaleText = (
  q: AuditableQuestion,
  locale: string,
  story: string,
  question: string
): AuditViolation[] => {
  const text = `${story} ${question}`;
  const msgs = localeNumberViolations(
    text,
    locale,
    q.operands,
    q.expectedAnswer,
    q.kind === 'counting' ? 'count' : q.kind === 'addition' ? 'addition' : 'subtraction'
  );
  return msgs.map((detail) => ({
    id: q.id,
    lesson: q.lesson,
    check: 'locale_numbers',
    detail,
  }));
};

export const checkEquationChips = (
  num1: number,
  num2: number,
  operator: '+' | '−',
  seed: number
): AuditViolation[] => {
  const chips = buildEquationChipValues(num1, num2, operator, mulberry32(seed));
  const v: AuditViolation[] = [];
  const total = computeExpectedAnswer(operator, num1, num2);
  if (chips.includes(total)) {
    v.push({
      id: `eq-${num1}-${num2}`,
      lesson: 'equationBuilder',
      check: 'no_answer_chip',
      detail: `chips ${chips.join(',')} include result ${total}`,
    });
  }
  if (!chips.includes(num1) || !chips.includes(num2)) {
    v.push({
      id: `eq-${num1}-${num2}`,
      lesson: 'equationBuilder',
      check: 'operands_present',
      detail: `chips ${chips.join(',')} missing operands`,
    });
  }
  // Every non-accepted pair is fine; ensure accepted orders work.
  if (!equationAccepts(num1, num2, num1, num2, operator)) {
    v.push({
      id: `eq-${num1}-${num2}`,
      lesson: 'equationBuilder',
      check: 'accept_canonical',
      detail: 'canonical order rejected',
    });
  }
  if (operator === '+' && !equationAccepts(num2, num1, num1, num2, operator)) {
    v.push({
      id: `eq-${num1}-${num2}`,
      lesson: 'equationBuilder',
      check: 'accept_commute',
      detail: 'addition commute rejected',
    });
  }
  if (operator === '−' && num1 !== num2 && equationAccepts(num2, num1, num1, num2, operator)) {
    v.push({
      id: `eq-${num1}-${num2}`,
      lesson: 'equationBuilder',
      check: 'reject_sub_flip',
      detail: 'subtraction reverse incorrectly accepted',
    });
  }
  return v;
};

export const checkTypedParsing = (): AuditViolation[] => {
  const cases: Array<{ input: string; expect: 'ok' | 'unreadable'; value?: number }> = [
    { input: '5', expect: 'ok', value: 5 },
    { input: ' 5 ', expect: 'ok', value: 5 },
    { input: '05', expect: 'ok', value: 5 },
    { input: '٥', expect: 'ok', value: 5 },
    { input: '५', expect: 'ok', value: 5 },
    { input: '5abc', expect: 'unreadable' },
    { input: '', expect: 'unreadable' },
    { input: '-', expect: 'unreadable' },
    { input: '5.0', expect: 'unreadable' },
    { input: '٣', expect: 'ok', value: 3 },
  ];
  const v: AuditViolation[] = [];
  for (const c of cases) {
    const got = parseStudentAnswer(c.input);
    if (got.status !== c.expect) {
      v.push({
        id: `parse:${JSON.stringify(c.input)}`,
        lesson: 'parseStudentAnswer',
        check: 'typed_parse',
        detail: `expected ${c.expect}, got ${got.status}`,
      });
    } else if (c.expect === 'ok' && got.status === 'ok' && got.value !== c.value) {
      v.push({
        id: `parse:${JSON.stringify(c.input)}`,
        lesson: 'parseStudentAnswer',
        check: 'typed_parse',
        detail: `expected value ${c.value}, got ${got.value}`,
      });
    }
  }
  return v;
};

export const runAudit = (questions: AuditableQuestion[]): AuditResult => {
  const violations: AuditViolation[] = [];
  for (const q of questions) {
    violations.push(...checkQuestion(q));
  }
  return { total: questions.length, violations };
};
