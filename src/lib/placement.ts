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

/** Item bank spanning planet skills. Adaptive selection pulls from the active level. */
export const PLACEMENT_BANK: PlacementQuestion[] = [
  // Counting to 10
  {
    id: 'c10-a',
    level: 'count10',
    promptKey: 'place_q_count',
    dots: 4,
    answer: 4,
    choices: [2, 3, 4, 5],
  },
  {
    id: 'c10-b',
    level: 'count10',
    promptKey: 'place_q_count',
    dots: 7,
    answer: 7,
    choices: [5, 6, 7, 8],
  },
  {
    id: 'c10-c',
    level: 'count10',
    promptKey: 'place_q_count',
    dots: 9,
    answer: 9,
    choices: [7, 8, 9, 10],
  },
  // Counting to 20
  {
    id: 'c20-a',
    level: 'count20',
    promptKey: 'place_q_howMany',
    equation: '14',
    answer: 14,
    choices: [12, 14, 16, 18],
  },
  {
    id: 'c20-b',
    level: 'count20',
    promptKey: 'place_q_howMany',
    equation: '17',
    answer: 17,
    choices: [15, 16, 17, 19],
  },
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
];

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
 * - Stops at maxItems, or at minItems once upward movement is frozen
 *   (or the top level was cleared).
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
  const canStopEarly = stopHarder || atTop;
  const done =
    itemsAnswered >= maxItems || (itemsAnswered >= minItems && canStopEarly);

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
