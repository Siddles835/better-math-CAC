import type { Operator } from './compute';
import type { AuditableQuestion } from './quizQuestions';
import {
  jupiterQuestion,
  mercuryQuestion,
  neptuneQuestion,
  venusQuestion,
} from './planetProblems';
import {
  adaptPath,
  buildPersonalPath,
  expectedFor,
  itemSignature,
  type PathItem,
} from '@/lib/cognition/personalPath';
import type { Diagnosis, MisconceptionCode } from '@/lib/cognition/types';

const stubDiagnosis = (code: MisconceptionCode): Diagnosis => ({
  primary: code,
  confidence: 1,
  scores: [],
  glowPlanets: [],
  nextPlanet: 'sun',
  kidLine: '',
  teacherLine: '',
  earlyWarning: null,
  updatedAt: 0,
});

/** CountingMercury. Numbers come from rollMercury. */
export const generateMercury = mercuryQuestion;

/** CountingVenus MCQ. Numbers and options come from rollVenus. */
export const generateVenusMcq = venusQuestion;

/** AdditionJupiter MCQ. Numbers come from rollJupiter. */
export const generateJupiterMcq = jupiterQuestion;

/** SubtractionNeptune MCQ. Numbers come from rollNeptune. */
export const generateNeptuneMcq = neptuneQuestion;

const CODES: MisconceptionCode[] = [
  'COUNT_ALL',
  'OVERSHOOT',
  'SUB_FLIP',
  'COMMUTE',
  'DIGIT_REV',
  'WORD_GAP',
  'PLACE_SPLIT',
  'STEADY',
];

const pathBuildOptions = (seed: number, recent?: string[]) => ({
  demo: true as const,
  round: seed % 5,
  entropy: seed,
  accuracy: (seed % 100) / 100,
  recent,
});

/**
 * Operands recompute to expectedFor(item). expectedAnswer stays item.target,
 * so a prompt/answer split fails expected_matches_operands.
 */
const personalPathQuestion = (item: PathItem, id: string, code: string): AuditableQuestion => {
  const canonical = expectedFor(item);
  let operator: Operator = 'count';
  let operands = [canonical];
  if (item.kind === 'count_on' || item.kind === 'same_sum' || item.kind === 'tens_ones') {
    operator = '+';
    operands = [item.start, item.add];
  } else if (item.kind === 'take_away') {
    operator = '−';
    operands = [item.start, item.add];
  } else if (item.kind === 'neighbor') {
    operator = '+';
    operands = [item.start, item.add < 0 ? -1 : 1];
  } else if (item.kind === 'write_digit') {
    operands = [item.digit ?? canonical];
  } else if (item.kind === 'exact_total' || item.kind === 'hear_build') {
    operands = [item.add];
  } else if (item.kind === 'compare') {
    operands = [canonical];
  }
  return {
    id,
    lesson: `personalPath/${code}`,
    kind: operator === '−' ? 'subtraction' : operator === '+' ? 'addition' : 'counting',
    operands,
    operator,
    shownText: item.prompt || item.speak || `${item.kind} ${item.start} ${item.add}`,
    expectedAnswer: item.target,
    options: [item.target],
    pictureCounts: [],
    range: [0, 100],
    story: '',
    question: item.kind,
  };
};

const OUTCOMES = [
  { tag: 'overshoot', correct: false, overshoot: true, reversal: false },
  { tag: 'reversal', correct: false, overshoot: false, reversal: true },
  { tag: 'miss', correct: false, overshoot: false, reversal: false },
] as const;

/**
 * Builds a path, rebuilds it with that path's signatures in `recent`, then
 * adapts the second path for overshoot, reversal, and a plain miss.
 * Every code is included. Each item's checked target must equal expectedFor.
 */
export const generatePersonalPathQuestions = (seed: number): AuditableQuestion[] => {
  const out: AuditableQuestion[] = [];
  for (const code of CODES) {
    const first = buildPersonalPath(`audit${seed}`, stubDiagnosis(code), '2026-01-01', pathBuildOptions(seed));
    const recent = first.items.map(itemSignature);
    const second = buildPersonalPath(
      `audit${seed}`,
      stubDiagnosis(code),
      '2026-01-01',
      pathBuildOptions(seed, recent)
    );
    const bundles: Array<[string, PathItem[]]> = [
      ['first', first.items],
      ['recent', second.items],
      ...OUTCOMES.map(
        (outcome) =>
          [
            outcome.tag,
            adaptPath(second, 0, {
              correct: outcome.correct,
              overshoot: outcome.overshoot,
              reversal: outcome.reversal,
            }).items,
          ] as [string, PathItem[]]
      ),
    ];
    for (const [tag, items] of bundles) {
      items.forEach((item, index) => {
        out.push(personalPathQuestion(item, `path-${seed}-${code}-${tag}-${index}-${item.id}`, code));
      });
    }
  }
  return out;
};

export const generateForLesson = (
  lesson: string,
  seed: number
): AuditableQuestion | AuditableQuestion[] => {
  switch (lesson) {
    case 'mercury':
      return generateMercury(seed);
    case 'venus':
      return generateVenusMcq(seed);
    case 'jupiter':
      return generateJupiterMcq(seed);
    case 'neptune':
      return generateNeptuneMcq(seed);
    case 'personalPath':
      return generatePersonalPathQuestions(seed);
    default:
      throw new Error(`Unknown generator lesson ${lesson}`);
  }
};
