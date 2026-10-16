import { getNextPlanet, type PlanetId } from '@/lib/planets';
import { getPlanetLevel } from '@/lib/planetLevels';

/** Skill bands probed by the placement check (easy → hard). */
export type PlacementLevelId =
  | 'count10'
  | 'count20'
  | 'count100'
  | 'add10'
  | 'add20'
  | 'sub10'
  | 'sub20'
  | 'placeValue';

export type PlacementOutcome = 'correct' | 'incorrect' | 'unreadable';

export interface PlacementQuestion {
  id: string;
  level: PlacementLevelId;
  promptKey: string;
  /** Values for {{a}} / {{b}} style prompt keys. */
  promptValues?: Record<string, string | number>;
  equation?: string;
  /** Visual count for counting items (rendered as dots; capped in UI). */
  dots?: number;
  answer: number;
  choices: number[];
}

export interface PlacementResult {
  startPlanet: PlanetId;
  unlockPlanet: PlanetId;
  /** Plain-language summary key (no scores). */
  summaryKey: string;
  /** Recommended planet label key from planetLevels. */
  labelKey: string;
  /** Highest staircase level cleared with two successes (−1 if none). */
  clearedLevelIndex: number;
  itemsAnswered: number;
}

export interface StaircaseConfig {
  minItems: number;
  maxItems: number;
  /** Successes at a level before moving up. */
  successThreshold: number;
  /** Misses at a level before freezing upward movement. */
  missThreshold: number;
}

export interface StaircaseState {
  levelIndex: number;
  successesAtLevel: number;
  missesAtLevel: number;
  /** Once true, never increase levelIndex. */
  stopHarder: boolean;
  /** Highest index that reached successThreshold. */
  clearedLevelIndex: number;
  itemsAnswered: number;
  done: boolean;
  /** How many bands this run can climb. Defaults to the foundations list. */
  levelCount: number;
  config: StaircaseConfig;
}

/** Easy → hard. Place value sits with addition before take-away. */
export const PLACEMENT_LEVELS: PlacementLevelId[] = [
  'count10',
  'count20',
  'count100',
  'add10',
  'add20',
  'placeValue',
  'sub10',
  'sub20',
];

export const DEFAULT_STAIRCASE: StaircaseConfig = {
  minItems: 12,
  maxItems: 16,
  successThreshold: 2,
  missThreshold: 2,
};

/** Build four nearby tap choices that include the answer. */
export const choicesAround = (answer: number, span = 1): number[] => {
  const set = new Set<number>([answer]);
  let delta = span;
  while (set.size < 4 && delta < 20) {
    if (answer - delta >= 0) set.add(answer - delta);
    if (set.size < 4) set.add(answer + delta);
    delta += 1;
  }
  return [...set].sort((a, b) => a - b).slice(0, 4);
};

const countQuestion = (
  id: string,
  level: PlacementLevelId,
  dots: number
): PlacementQuestion => ({
  id,
  level,
  promptKey: 'place_q_count',
  dots,
  answer: dots,
  choices: choicesAround(dots),
});

/** Item bank spanning planet skills. Adaptive selection pulls from the active level. */
export const PLACEMENT_BANK: PlacementQuestion[] = [
  // Counting to 10 — many unique dot counts so the check does not loop the same three.
  countQuestion('c10-3', 'count10', 3),
  countQuestion('c10-a', 'count10', 4),
  countQuestion('c10-5', 'count10', 5),
  countQuestion('c10-6', 'count10', 6),
  countQuestion('c10-b', 'count10', 7),
  countQuestion('c10-8', 'count10', 8),
  countQuestion('c10-c', 'count10', 9),
  countQuestion('c10-10', 'count10', 10),
  // Counting to 20
  countQuestion('c20-11', 'count20', 11),
  countQuestion('c20-12', 'count20', 12),
  countQuestion('c20-13', 'count20', 13),
  countQuestion('c20-a', 'count20', 14),
  countQuestion('c20-15', 'count20', 15),
  countQuestion('c20-16', 'count20', 16),
  countQuestion('c20-b', 'count20', 17),
  countQuestion('c20-18', 'count20', 18),
  {
    id: 'c20-c',
    level: 'count20',
    promptKey: 'place_q_next',
    equation: '11 → ?',
    answer: 12,
    choices: [10, 12, 13, 21],
  },
  // Counting / numbers to 100
  {
    id: 'c100-a',
    level: 'count100',
    promptKey: 'place_q_howMany',
    equation: '40',
    answer: 40,
    choices: [14, 40, 44, 60],
  },
  {
    id: 'c100-b',
    level: 'count100',
    promptKey: 'place_q_next',
    equation: '59 → ?',
    answer: 60,
    choices: [50, 58, 60, 69],
  },
  {
    id: 'c100-c',
    level: 'count100',
    promptKey: 'place_q_howMany',
    equation: '85',
    answer: 85,
    choices: [58, 80, 85, 95],
  },
  {
    id: 'c100-d',
    level: 'count100',
    promptKey: 'place_q_howMany',
    equation: '70',
    answer: 70,
    choices: [17, 60, 70, 77],
  },
  {
    id: 'c100-e',
    level: 'count100',
    promptKey: 'place_q_next',
    equation: '29 → ?',
    answer: 30,
    choices: [19, 28, 30, 39],
  },
  // Add within 10
  {
    id: 'a10-a',
    level: 'add10',
    promptKey: 'place_q_add',
    equation: '3 + 2',
    answer: 5,
    choices: [4, 5, 6, 7],
  },
  {
    id: 'a10-b',
    level: 'add10',
    promptKey: 'place_q_add',
    equation: '4 + 5',
    answer: 9,
    choices: [7, 8, 9, 10],
  },
  {
    id: 'a10-c',
    level: 'add10',
    promptKey: 'place_q_add',
    equation: '6 + 3',
    answer: 9,
    choices: [8, 9, 10, 12],
  },
  {
    id: 'a10-d',
    level: 'add10',
    promptKey: 'place_q_add',
    equation: '2 + 7',
    answer: 9,
    choices: [7, 8, 9, 10],
  },
  {
    id: 'a10-e',
    level: 'add10',
    promptKey: 'place_q_add',
    equation: '5 + 4',
    answer: 9,
    choices: [8, 9, 10, 11],
  },
  {
    id: 'a10-f',
    level: 'add10',
    promptKey: 'place_q_add',
    equation: '1 + 6',
    answer: 7,
    choices: [5, 6, 7, 8],
  },
  // Add within 20
  {
    id: 'a20-a',
    level: 'add20',
    promptKey: 'place_q_add',
    equation: '8 + 7',
    answer: 15,
    choices: [13, 14, 15, 16],
  },
  {
    id: 'a20-b',
    level: 'add20',
    promptKey: 'place_q_add',
    equation: '9 + 6',
    answer: 15,
    choices: [14, 15, 16, 18],
  },
  {
    id: 'a20-c',
    level: 'add20',
    promptKey: 'place_q_add',
    equation: '12 + 5',
    answer: 17,
    choices: [15, 16, 17, 19],
  },
  {
    id: 'a20-d',
    level: 'add20',
    promptKey: 'place_q_add',
    equation: '11 + 4',
    answer: 15,
    choices: [13, 14, 15, 16],
  },
  {
    id: 'a20-e',
    level: 'add20',
    promptKey: 'place_q_add',
    equation: '10 + 8',
    answer: 18,
    choices: [16, 17, 18, 19],
  },
  // Sub within 10
  {
    id: 's10-a',
    level: 'sub10',
    promptKey: 'place_q_sub',
    equation: '7 − 2',
    answer: 5,
    choices: [3, 4, 5, 9],
  },
  {
    id: 's10-b',
    level: 'sub10',
    promptKey: 'place_q_sub',
    equation: '9 − 4',
    answer: 5,
    choices: [4, 5, 6, 13],
  },
  {
    id: 's10-c',
    level: 'sub10',
    promptKey: 'place_q_sub',
    equation: '8 − 3',
    answer: 5,
    choices: [3, 5, 6, 11],
  },
  {
    id: 's10-d',
    level: 'sub10',
    promptKey: 'place_q_sub',
    equation: '6 − 1',
    answer: 5,
    choices: [4, 5, 6, 7],
  },
  {
    id: 's10-e',
    level: 'sub10',
    promptKey: 'place_q_sub',
    equation: '10 − 3',
    answer: 7,
    choices: [5, 6, 7, 13],
  },
  // Sub within 20
  {
    id: 's20-a',
    level: 'sub20',
    promptKey: 'place_q_sub',
    equation: '15 − 6',
    answer: 9,
    choices: [7, 8, 9, 11],
  },
  {
    id: 's20-b',
    level: 'sub20',
    promptKey: 'place_q_sub',
    equation: '18 − 9',
    answer: 9,
    choices: [8, 9, 10, 27],
  },
  {
    id: 's20-c',
    level: 'sub20',
    promptKey: 'place_q_sub',
    equation: '14 − 5',
    answer: 9,
    choices: [8, 9, 10, 19],
  },
  {
    id: 's20-d',
    level: 'sub20',
    promptKey: 'place_q_sub',
    equation: '16 − 7',
    answer: 9,
    choices: [7, 8, 9, 10],
  },
  {
    id: 's20-e',
    level: 'sub20',
    promptKey: 'place_q_sub',
    equation: '13 − 4',
    answer: 9,
    choices: [8, 9, 10, 17],
  },
  // Place value
  {
    id: 'pv-a',
    level: 'placeValue',
    promptKey: 'place_q_tensOnes',
    equation: '1 ten + 4 ones',
    answer: 14,
    choices: [5, 14, 41, 104],
  },
  {
    id: 'pv-b',
    level: 'placeValue',
    promptKey: 'place_q_tensOnes',
    equation: '3 tens + 0 ones',
    answer: 30,
    choices: [3, 13, 30, 33],
  },
  {
    id: 'pv-c',
    level: 'placeValue',
    promptKey: 'place_q_tensOnes',
    equation: '2 tens + 7 ones',
    answer: 27,
    choices: [9, 27, 72, 207],
  },
  {
    id: 'pv-d',
    level: 'placeValue',
    promptKey: 'place_q_tensOnes',
    equation: '4 tens + 2 ones',
    answer: 42,
    choices: [6, 24, 42, 420],
  },
  {
    id: 'pv-e',
    level: 'placeValue',
    promptKey: 'place_q_tensOnes',
    equation: '5 tens + 5 ones',
    answer: 55,
    choices: [10, 50, 55, 505],
  },
];

/**
 * Value shown by a placement equation.
 * Forms: `a + b`, `a − b`, `N ten(s) + M one(s)`, `N → ?`, or a bare numeral.
 */
export const answerFromPlacementEquation = (equation: string): number => {
  const add = equation.match(/^(\d+) \+ (\d+)$/);
  if (add) return Number(add[1]) + Number(add[2]);
  const sub = equation.match(/^(\d+) − (\d+)$/);
  if (sub) return Number(sub[1]) - Number(sub[2]);
  const place = equation.match(/^(\d+) tens? \+ (\d+) ones?$/);
  if (place) return Number(place[1]) * 10 + Number(place[2]);
  const next = equation.match(/^(\d+) → \?$/);
  if (next) return Number(next[1]) + 1;
  if (/^\d+$/.test(equation)) return Number(equation);
  throw new Error(`Unrecognized placement equation: ${equation}`);
};

/** @deprecated Prefer PLACEMENT_BANK + staircase; kept for any leftover imports. */
export const PLACEMENT_QUESTIONS = PLACEMENT_BANK.filter((q) =>
  ['c10-a', 'a10-a', 's10-a'].includes(q.id)
);

export const createStaircase = (
  config: Partial<StaircaseConfig> = {},
  levelCount = PLACEMENT_LEVELS.length
): StaircaseState => ({
  levelIndex: 0,
  successesAtLevel: 0,
  missesAtLevel: 0,
  stopHarder: false,
  clearedLevelIndex: -1,
  itemsAnswered: 0,
  done: false,
  levelCount,
  config: { ...DEFAULT_STAIRCASE, ...config },
});

/**
 * Pure adaptive staircase.
 * - Unreadable outcomes do not count as wrong and do not advance item count.
 * - After `successThreshold` successes at a level, move up (unless stopHarder).
 * - After `missThreshold` misses at a level, freeze upward movement.
 * - Once frozen, stop soon (clear the band or a couple more tries) so the
 *   child is not stuck on the same few items until minItems.
 * - At the top band, still use minItems before finishing.
 */
export const nextStaircaseState = (
  state: StaircaseState,
  outcome: PlacementOutcome
): StaircaseState => {
  if (state.done) return state;
  if (outcome === 'unreadable') return { ...state };

  const { successThreshold, missThreshold, minItems, maxItems } = state.config;
  const levelCount = state.levelCount || PLACEMENT_LEVELS.length;
  let levelIndex = state.levelIndex;
  let successesAtLevel = state.successesAtLevel;
  let missesAtLevel = state.missesAtLevel;
  let stopHarder = state.stopHarder;
  let clearedLevelIndex = state.clearedLevelIndex;
  const itemsAnswered = state.itemsAnswered + 1;

  if (outcome === 'correct') {
    successesAtLevel += 1;
    if (successesAtLevel >= successThreshold) {
      clearedLevelIndex = Math.max(clearedLevelIndex, levelIndex);
      if (!stopHarder && levelIndex < levelCount - 1) {
        levelIndex += 1;
        successesAtLevel = 0;
        missesAtLevel = 0;
      }
    }
  } else {
    missesAtLevel += 1;
    if (missesAtLevel >= missThreshold) {
      stopHarder = true;
    }
  }

  const atTop = clearedLevelIndex >= levelCount - 1;
  // After freeze: either they clear this band, or they miss a couple more times.
  const clearedFrozenBand =
    stopHarder && clearedLevelIndex >= levelIndex && successesAtLevel >= successThreshold;
  const gaveUpFrozenBand = stopHarder && missesAtLevel >= missThreshold + successThreshold;
  const done =
    itemsAnswered >= maxItems ||
    (atTop && itemsAnswered >= minItems) ||
    clearedFrozenBand ||
    gaveUpFrozenBand;

  return {
    levelIndex,
    successesAtLevel,
    missesAtLevel,
    stopHarder,
    clearedLevelIndex,
    itemsAnswered,
    done,
    levelCount,
    config: state.config,
  };
};

/** Map cleared staircase band → recommended starting planet. */
export const planetForClearedLevel = (clearedLevelIndex: number): PlanetId => {
  if (clearedLevelIndex < 0) return 'sun';
  const level = PLACEMENT_LEVELS[clearedLevelIndex];
  switch (level) {
    case 'count10':
      return 'mercury';
    case 'count20':
      return 'venus';
    case 'count100':
      return 'venus';
    case 'add10':
      return 'earth';
    case 'add20':
      return 'mars';
    case 'placeValue':
      return 'jupiter';
    case 'sub10':
      return 'saturn';
    case 'sub20':
      return 'uranus';
    default:
      return 'sun';
  }
};

export const resultFromStaircase = (state: StaircaseState): PlacementResult => {
  const startPlanet = planetForClearedLevel(state.clearedLevelIndex);
  const next = getNextPlanet(startPlanet);
  const unlockPlanet = next ?? startPlanet;
  const info = getPlanetLevel(startPlanet);
  const summaryKey =
    state.clearedLevelIndex < 0
      ? 'place_sum_sun'
      : startPlanet === 'jupiter'
        ? 'place_sum_place'
        : info.topic === 'counting'
          ? 'place_sum_count'
          : info.topic === 'addition'
            ? 'place_sum_add'
            : 'place_sum_sub';

  return {
    startPlanet,
    unlockPlanet,
    summaryKey,
    labelKey: info.labelKey,
    clearedLevelIndex: state.clearedLevelIndex,
    itemsAnswered: state.itemsAnswered,
  };
};

export const skippedPlacement = (): PlacementResult => ({
  startPlanet: 'sun',
  unlockPlanet: 'sun',
  summaryKey: 'place_sum_skip',
  labelKey: getPlanetLevel('sun').labelKey,
  clearedLevelIndex: -1,
  itemsAnswered: 0,
});

export const questionsForLevel = (levelId: PlacementLevelId): PlacementQuestion[] =>
  PLACEMENT_BANK.filter((q) => q.level === levelId);

/**
 * Pick the next unused question at the active level.
 * Falls back to any unused bank item, then wraps.
 */
export const pickQuestion = (
  state: StaircaseState,
  usedIds: ReadonlySet<string>
): PlacementQuestion => {
  const levelId = PLACEMENT_LEVELS[state.levelIndex] ?? 'count10';
  const pool = questionsForLevel(levelId);
  const fresh = pool.find((q) => !usedIds.has(q.id));
  if (fresh) return fresh;
  const anyFresh = PLACEMENT_BANK.find((q) => !usedIds.has(q.id));
  if (anyFresh) return anyFresh;
  return pool[state.itemsAnswered % pool.length] ?? PLACEMENT_BANK[0];
};

/** Score a value against a question (drawings already resolved to numbers). */
export const isCorrectAnswer = (question: PlacementQuestion, value: number): boolean =>
  value === question.answer;

/**
 * Simulate a full run with a fixed outcome policy — used by tests.
 * `outcomes` is consumed in order; if exhausted, repeats the last outcome.
 */
export const runStaircase = (
  outcomes: PlacementOutcome[],
  config: Partial<StaircaseConfig> = {}
): { state: StaircaseState; result: PlacementResult } => {
  let state = createStaircase(config);
  let i = 0;
  while (!state.done) {
    const outcome = outcomes[Math.min(i, outcomes.length - 1)] ?? 'incorrect';
    i += 1;
    // Guard against infinite loops if only unreadables are fed.
    if (outcome === 'unreadable' && i > 40) break;
    state = nextStaircaseState(state, outcome);
  }
  return { state, result: resultFromStaircase(state) };
};

/** Legacy helper used by older 3-item tests — maps fixed answers to a result. */
export const scorePlacement = (answers: Record<string, number>): PlacementResult => {
  const outcomes: PlacementOutcome[] = [];
  for (const q of PLACEMENT_QUESTIONS) {
    outcomes.push(answers[q.id] === q.answer ? 'correct' : 'incorrect');
  }
  // Pad to drive staircase with the same band pattern.
  while (outcomes.length < DEFAULT_STAIRCASE.minItems) {
    const last = outcomes[outcomes.length - 1] ?? 'incorrect';
    outcomes.push(last);
  }
  return runStaircase(outcomes).result;
};
