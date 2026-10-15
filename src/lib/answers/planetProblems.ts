import { computeExpectedAnswer } from './compute';
import { buildMcqOptions } from './options';
import { mulberry32, pickInt, type Rng } from './rng';
import type { AuditableQuestion } from './quizQuestions';

/**
 * Planet lesson numbers and stories. Lesson pages and the answer audit both
 * import these. Do not copy the numbers into a page or a second generator.
 */

export const EARTH = {
  demoLeft: 3,
  demoRight: 2,
  practiceAvailable: 5,
  buildStart: 2,
  buildTarget: 6,
  buildAvailable: 6,
};

export const earthDemoTotal = EARTH.demoLeft + EARTH.demoRight;
export const earthBuildAdd = EARTH.buildTarget - EARTH.buildStart;

export const earthDemoStory = () =>
  `${EARTH.demoLeft} + ${EARTH.demoRight} = ${earthDemoTotal}`;

export const earthBuildStory = () =>
  `Add until you have ${EARTH.buildTarget} pencils. You start with ${EARTH.buildStart}.`;

export const MARS = {
  start: 3,
  target: 7,
  available: 5,
};

export const marsNeed = MARS.target - MARS.start;

export const marsStory = () =>
  `Emma has ${MARS.start} pencils. She wants ${MARS.target} pencils total. How many more does she need?`;

export const SATURN = {
  demoStart: 5,
  demoTake: 2,
  practiceStart: 6,
  buildStart: 7,
  buildTarget: 4,
};

export const saturnDemoLeft = SATURN.demoStart - SATURN.demoTake;
export const saturnBuildTake = SATURN.buildStart - SATURN.buildTarget;

export const saturnDemoStory = () =>
  `${SATURN.demoStart} − ${SATURN.demoTake} = ${saturnDemoLeft}`;

export const saturnPracticeStory = () =>
  `Tap pencils to take them away. Start with ${SATURN.practiceStart} pencils.`;

export const saturnBuildStory = () =>
  `Take away until you have ${SATURN.buildTarget} pencils. You start with ${SATURN.buildStart}.`;

export const URANUS = {
  start: 8,
  keep: 5,
};

export const uranusGiveAway = URANUS.start - URANUS.keep;

export const uranusStory = () =>
  `Mr. Chen has ${URANUS.start} pencils. He wants to keep ${URANUS.keep} pencils. How many can he give away?`;

export const SUN = {
  available: 7,
  maxInBasket: 9,
};

/** The digit the child writes must be the number of apples they placed. */
export const sunExpected = (basketCount: number): number => basketCount;

export const sunStory = (basketCount: number) =>
  `Write the number of apples in the basket (${sunExpected(basketCount)}).`;

export const MERCURY_RANGE = [3, 6] as const;
export const MERCURY_AVAILABLE = 7;

export const rollMercury = (rng: Rng) => ({
  target: pickInt(rng, MERCURY_RANGE[0], MERCURY_RANGE[1]),
  available: MERCURY_AVAILABLE,
});

export const mercuryStory = (target: number) => `Jo needs ${target} pie pieces`;

export const VENUS_RANGE = [2, 7] as const;

export const rollVenus = (rng: Rng) => {
  const count = pickInt(rng, VENUS_RANGE[0], VENUS_RANGE[1]);
  return { count, options: buildMcqOptions(count, rng, 1, 8) };
};

export const venusStory = (count: number) => `Count the items: ${count}`;

export const JUPITER_RANGE = [1, 4] as const;

export const rollJupiter = (rng: Rng) => {
  const a = pickInt(rng, JUPITER_RANGE[0], JUPITER_RANGE[1]);
  const b = pickInt(rng, JUPITER_RANGE[0], JUPITER_RANGE[1]);
  const answer = computeExpectedAnswer('+', a, b);
  return { a, b, answer, options: buildMcqOptions(answer, rng, 1, 8) };
};

export const jupiterStory = (a: number, b: number) => `What is ${a} + ${b}?`;

export const NEPTUNE_START = [5, 8] as const;
export const NEPTUNE_TAKE = [1, 3] as const;

export const rollNeptune = (rng: Rng) => {
  const a = pickInt(rng, NEPTUNE_START[0], NEPTUNE_START[1]);
  const b = pickInt(rng, NEPTUNE_TAKE[0], NEPTUNE_TAKE[1]);
  const answer = computeExpectedAnswer('−', a, b);
  return { a, b, answer, options: buildMcqOptions(answer, rng, 0, 8) };
};

export const neptuneStory = (a: number, b: number) => `What is ${a} − ${b}?`;

const question = (
  partial: Omit<AuditableQuestion, 'options' | 'pictureCounts' | 'story'> & {
    options?: number[];
    pictureCounts?: number[];
    story?: string;
  }
): AuditableQuestion => ({
  options: partial.options ?? [partial.expectedAnswer],
  pictureCounts: partial.pictureCounts ?? [],
  story: partial.story ?? '',
  ...partial,
});

export const earthAuditQuestions = (): AuditableQuestion[] => [
  question({
    id: 'earth-demo',
    lesson: 'addition/earth',
    kind: 'addition',
    operands: [EARTH.demoLeft, EARTH.demoRight],
    operator: '+',
    shownText: earthDemoStory(),
    expectedAnswer: earthDemoTotal,
    pictureCounts: [EARTH.demoLeft, EARTH.demoRight],
    range: [0, 10],
    question: earthDemoStory(),
  }),
  question({
    id: 'earth-build',
    lesson: 'addition/earth',
    kind: 'addition',
    operands: [EARTH.buildStart, earthBuildAdd],
    operator: '+',
    shownText: earthBuildStory(),
    expectedAnswer: EARTH.buildTarget,
    pictureCounts: [EARTH.buildStart],
    range: [0, 10],
    question: earthBuildStory(),
  }),
];

export const marsAuditQuestion = (): AuditableQuestion =>
  question({
    id: 'mars-word',
    lesson: 'addition/mars',
    kind: 'addition',
    operands: [MARS.start, marsNeed],
    operator: '+',
    shownText: marsStory(),
    expectedAnswer: MARS.target,
    pictureCounts: [MARS.start],
    range: [0, 10],
    question: marsStory(),
  });

export const saturnAuditQuestions = (): AuditableQuestion[] => [
  question({
    id: 'saturn-demo',
    lesson: 'subtraction/saturn',
    kind: 'subtraction',
    operands: [SATURN.demoStart, SATURN.demoTake],
    operator: '−',
    shownText: saturnDemoStory(),
    expectedAnswer: saturnDemoLeft,
    pictureCounts: [SATURN.demoStart],
    range: [0, 10],
    question: saturnDemoStory(),
  }),
  question({
    id: 'saturn-build',
    lesson: 'subtraction/saturn',
    kind: 'subtraction',
    operands: [SATURN.buildStart, saturnBuildTake],
    operator: '−',
    shownText: saturnBuildStory(),
    expectedAnswer: SATURN.buildTarget,
    pictureCounts: [SATURN.buildStart],
    range: [0, 10],
    question: saturnBuildStory(),
  }),
];

export const uranusAuditQuestion = (): AuditableQuestion =>
  question({
    id: 'uranus-word',
    lesson: 'subtraction/uranus',
    kind: 'subtraction',
    operands: [URANUS.start, uranusGiveAway],
    operator: '−',
    shownText: uranusStory(),
    expectedAnswer: URANUS.keep,
    pictureCounts: [URANUS.start],
    range: [0, 10],
    question: uranusStory(),
  });

export const sunAuditQuestions = (): AuditableQuestion[] =>
  Array.from({ length: SUN.maxInBasket }, (_, index) => {
    const count = index + 1;
    return question({
      id: `sun-${count}`,
      lesson: 'counting/sun',
      kind: 'counting',
      operands: [sunExpected(count)],
      operator: 'count',
      shownText: sunStory(count),
      expectedAnswer: sunExpected(count),
      pictureCounts: [count],
      range: [0, SUN.maxInBasket],
      question: sunStory(count),
    });
  });

export const planetAuditQuestions = (): AuditableQuestion[] => [
  ...earthAuditQuestions(),
  marsAuditQuestion(),
  ...saturnAuditQuestions(),
  uranusAuditQuestion(),
  ...sunAuditQuestions(),
];

export const mercuryQuestion = (seed: number): AuditableQuestion => {
  const spec = rollMercury(mulberry32(seed));
  return question({
    id: `mercury-${seed}`,
    lesson: 'counting/mercury',
    kind: 'counting',
    operands: [spec.target],
    operator: 'count',
    shownText: mercuryStory(spec.target),
    expectedAnswer: spec.target,
    options: [spec.target],
    pictureCounts: [spec.target],
    range: [MERCURY_RANGE[0], MERCURY_RANGE[1]],
    question: mercuryStory(spec.target),
  });
};

export const venusQuestion = (seed: number): AuditableQuestion => {
  const spec = rollVenus(mulberry32(seed));
  return question({
    id: `venus-${seed}`,
    lesson: 'counting/venus',
    kind: 'counting',
    operands: [spec.count],
    operator: 'count',
    shownText: venusStory(spec.count),
    expectedAnswer: spec.count,
    options: spec.options,
    pictureCounts: [spec.count],
    range: [VENUS_RANGE[0], VENUS_RANGE[1]],
    question: 'How many?',
  });
};

export const jupiterQuestion = (seed: number): AuditableQuestion => {
  const spec = rollJupiter(mulberry32(seed));
  return question({
    id: `jupiter-${seed}`,
    lesson: 'addition/jupiter',
    kind: 'addition',
    operands: [spec.a, spec.b],
    operator: '+',
    shownText: jupiterStory(spec.a, spec.b),
    expectedAnswer: spec.answer,
    options: spec.options,
    pictureCounts: [],
    range: [1, 8],
    question: `${spec.a} + ${spec.b}`,
  });
};

export const neptuneQuestion = (seed: number): AuditableQuestion => {
  const spec = rollNeptune(mulberry32(seed));
  return question({
    id: `neptune-${seed}`,
    lesson: 'subtraction/neptune',
    kind: 'subtraction',
    operands: [spec.a, spec.b],
    operator: '−',
    shownText: neptuneStory(spec.a, spec.b),
    expectedAnswer: spec.answer,
    options: spec.options,
    pictureCounts: [],
    range: [0, 8],
    question: `${spec.a} − ${spec.b}`,
  });
};
