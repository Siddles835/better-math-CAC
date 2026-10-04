import { computeExpectedAnswer } from './compute';
import { buildMcqOptions } from './options';
import { mulberry32, pickInt, type Rng } from './rng';
import type { AuditableQuestion } from './quizQuestions';
import { buildPersonalPath } from '@/lib/cognition/personalPath';
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

/** CountingMercury: target count in 3..6 */
export const generateMercury = (seed: number): AuditableQuestion => {
  const rng = mulberry32(seed);
  const target = pickInt(rng, 3, 6);
  return {
    id: `mercury-${seed}`,
    lesson: 'counting/mercury',
    kind: 'counting',
    operands: [target],
    operator: 'count',
    shownText: `Jo needs ${target} pie pieces`,
    expectedAnswer: target,
    options: [target],
    pictureCounts: [target],
    range: [3, 6],
    story: '',
    question: `Need ${target}`,
  };
};

/** CountingVenus MCQ: count 2..7 with 4 unique options */
export const generateVenusMcq = (seed: number): AuditableQuestion => {
  const rng = mulberry32(seed);
  const count = pickInt(rng, 2, 7);
  const options = buildMcqOptions(count, rng, 1, 8);
  return {
    id: `venus-${seed}`,
    lesson: 'counting/venus',
    kind: 'counting',
    operands: [count],
    operator: 'count',
    shownText: `Count the items: ${count}`,
    expectedAnswer: count,
    options,
    pictureCounts: [count],
    range: [2, 7],
    story: '',
    question: `How many?`,
  };
};

/** AdditionJupiter MCQ: a,b in 1..4 */
export const generateJupiterMcq = (seed: number): AuditableQuestion => {
  const rng = mulberry32(seed);
  const a = pickInt(rng, 1, 4);
  const b = pickInt(rng, 1, 4);
  const answer = computeExpectedAnswer('+', a, b);
  const options = buildMcqOptions(answer, rng, 1, 8);
  return {
    id: `jupiter-${seed}`,
    lesson: 'addition/jupiter',
    kind: 'addition',
    operands: [a, b],
    operator: '+',
    shownText: `What is ${a} + ${b}?`,
    expectedAnswer: answer,
    options,
    pictureCounts: [],
    range: [1, 8],
    story: '',
    question: `${a} + ${b}`,
  };
};

/** SubtractionNeptune MCQ: a in 5..8, b in 1..3, non-negative */
export const generateNeptuneMcq = (seed: number): AuditableQuestion => {
  const rng = mulberry32(seed);
  const a = pickInt(rng, 5, 8);
  const b = pickInt(rng, 1, 3);
  const answer = computeExpectedAnswer('−', a, b);
  const options = buildMcqOptions(answer, rng, 0, 8);
  return {
    id: `neptune-${seed}`,
    lesson: 'subtraction/neptune',
    kind: 'subtraction',
    operands: [a, b],
    operator: '−',
    shownText: `What is ${a} − ${b}?`,
    expectedAnswer: answer,
    options,
    pictureCounts: [],
    range: [0, 8],
    story: '',
    question: `${a} − ${b}`,
  };
};

/** Static planet demo problems (Earth/Mars/Saturn/Uranus explanatory + build tasks). */
export const staticPlanetProblems = (): AuditableQuestion[] => {
  const earthDemoLeft = 3;
  const earthDemoRight = 2;
  const earthTargetLeft = 2;
  const earthTarget = 6;
  const marsLeft = 3;
  const marsTarget = 7;
  const saturnStart = 7;
  const saturnTarget = 4;
  const uranusStart = 8;
  const uranusKeep = 5;

  return [
    {
      id: 'earth-demo',
      lesson: 'addition/earth',
      kind: 'addition',
      operands: [earthDemoLeft, earthDemoRight],
      operator: '+',
      shownText: `${earthDemoLeft} + ${earthDemoRight} = ${earthDemoLeft + earthDemoRight}`,
      expectedAnswer: earthDemoLeft + earthDemoRight,
      options: [earthDemoLeft + earthDemoRight],
      pictureCounts: [earthDemoLeft, earthDemoRight],
      range: [0, 10],
      story: '',
      question: 'demo',
    },
    {
      id: 'earth-build',
      lesson: 'addition/earth',
      kind: 'addition',
      operands: [earthTargetLeft, earthTarget - earthTargetLeft],
      operator: '+',
      shownText: `Add until ${earthTarget}, start ${earthTargetLeft}`,
      expectedAnswer: earthTarget,
      options: [earthTarget],
      pictureCounts: [earthTargetLeft],
      range: [0, 10],
      story: '',
      question: 'build',
    },
    {
      id: 'mars-word',
      lesson: 'addition/mars',
      kind: 'addition',
      operands: [marsLeft, marsTarget - marsLeft],
      operator: '+',
      shownText: `Emma has ${marsLeft} pencils. She needs ${marsTarget - marsLeft} more to make ${marsTarget}.`,
      expectedAnswer: marsTarget,
      options: [marsTarget],
      pictureCounts: [marsLeft],
      range: [0, 10],
      story: '',
      question: 'how many more',
    },
    {
      id: 'saturn-build',
      lesson: 'subtraction/saturn',
      kind: 'subtraction',
      operands: [saturnStart, saturnStart - saturnTarget],
      operator: '−',
      shownText: `Start with ${saturnStart}. Take away ${saturnStart - saturnTarget}. Leave ${saturnTarget}.`,
      expectedAnswer: saturnTarget,
      options: [saturnTarget],
      pictureCounts: [saturnStart],
      range: [0, 10],
      story: '',
      question: 'take away',
    },
    {
      id: 'uranus-word',
      lesson: 'subtraction/uranus',
      kind: 'subtraction',
      operands: [uranusStart, uranusStart - uranusKeep],
      operator: '−',
      shownText: `Mr. Chen has ${uranusStart} pencils. He gives away ${uranusStart - uranusKeep} to keep ${uranusKeep}.`,
      expectedAnswer: uranusKeep,
      options: [uranusKeep],
      pictureCounts: [uranusStart],
      range: [0, 10],
      story: '',
      question: 'give away',
    },
  ];
};

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

export const generatePersonalPathQuestions = (seed: number): AuditableQuestion[] => {
  const code = CODES[seed % CODES.length];
  const path = buildPersonalPath(`audit${seed}`, stubDiagnosis(code), '2026-01-01', {
    demo: true,
    round: seed % 5,
    entropy: seed,
    accuracy: (seed % 100) / 100,
  });
  return path.items.map((item, i) => {
    let operator: AuditableQuestion['operator'] = 'count';
    let operands = [item.target];
    if (item.kind === 'take_away') {
      operator = '−';
      operands = [item.start, item.add];
    } else if (item.kind === 'count_on' || item.kind === 'same_sum' || item.kind === 'tens_ones') {
      operator = '+';
      operands = [item.start, item.add];
    } else if (item.kind === 'write_digit') {
      operands = [item.digit ?? item.target];
    }
    const expected =
      item.kind === 'write_digit' ? (item.digit ?? item.target) : item.target;
    return {
      id: `path-${seed}-${i}-${item.id}`,
      lesson: `personalPath/${path.code}`,
      kind:
        operator === '−' ? 'subtraction' : operator === '+' ? 'addition' : 'counting',
      operands,
      operator,
      shownText: item.prompt || item.speak || `target ${item.target}`,
      // Must equal recomputed value from operands (audit enforces).
      expectedAnswer: expected,
      options: [expected],
      pictureCounts: item.kind === 'write_digit' ? [] : [item.start],
      range: [0, 100] as [number, number],
      story: '',
      question: item.kind,
    };
  });
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

export type { Rng };
