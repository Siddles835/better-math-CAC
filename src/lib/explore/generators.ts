import { hashSeed, mulberry32, pickInt, pickOne, shuffle } from './rng';
import { makeGoalForBand, maxForBand } from './level';
import type {
  BuildStoryPrompt,
  ExploreActivityId,
  ExploreBand,
  ExplorePrompt,
  MakeTenPrompt,
  NumberLinePrompt,
  NumberTalkPrompt,
  PatternSkipPrompt,
  ShowMePrompt,
  WodbOption,
  WodbPrompt,
} from './types';

export { bandFromPlanet, makeGoalForBand, maxForBand } from './level';
export type { ExploreBand } from './types';

const OBSERVATION_POOL = [
  'obs_groups',
  'obs_five',
  'obs_ten',
  'obs_pairs',
  'obs_rows',
  'obs_symmetry',
  'obs_near_ten',
] as const;

const WODB_REASONS = [
  'reason_odd_count',
  'reason_even_count',
  'reason_arrangement',
  'reason_most',
  'reason_least',
  'reason_not_square',
  'reason_not_line',
] as const;

const signatureOf = (prompt: ExplorePrompt): string => {
  switch (prompt.kind) {
    case 'show-me':
      return `show-me:${prompt.target}`;
    case 'quick-look':
      return `quick-look:${prompt.dots}:${prompt.groups.join(',')}`;
    case 'number-talk':
      return `number-talk:${prompt.total}:${prompt.pattern}:${prompt.groups.join(',')}`;
    case 'wodb':
      return `wodb:${prompt.options.map((o) => `${o.dots}-${o.arrangement}`).join('|')}`;
    case 'make-ten':
      return `make-ten:${prompt.goal}`;
    case 'number-line':
      return `number-line:${prompt.min}:${prompt.max}:${prompt.start}:${prompt.compare}:${prompt.hop}`;
    case 'build-story':
      return `build-story:${prompt.op}:${prompt.a}:${prompt.b}:${prompt.objectKey}`;
    case 'pattern-skip':
      return `pattern-skip:${prompt.mode}:${prompt.step}:${prompt.start}:${prompt.sequence.join(',')}`;
    default:
      return 'unknown';
  }
};

const groupsFor = (n: number, rng: () => number): number[] => {
  if (n <= 1) return [n];
  if (n <= 5 && rng() < 0.5) return [n];
  const a = pickInt(rng, 1, Math.max(1, n - 1));
  return [a, n - a];
};

export const generateShowMe = (band: ExploreBand, seed: number): ShowMePrompt => {
  const rng = mulberry32(seed);
  const max = Math.min(10, maxForBand(band));
  return { kind: 'show-me', target: pickInt(rng, 1, max), seed };
};

export const generateQuickLook = (band: ExploreBand, seed: number): QuickLookPrompt => {
  const rng = mulberry32(seed);
  const max = Math.min(band === 'to100' ? 10 : maxForBand(band), 10);
  const dots = pickInt(rng, 1, max);
  const flash = rng() < 0.55 ? pickOne(rng, [800, 1200, null] as const) : null;
  return {
    kind: 'quick-look',
    dots,
    groups: groupsFor(dots, rng),
    flashMs: flash,
    seed,
  };
};

export const generateNumberTalk = (band: ExploreBand, seed: number): NumberTalkPrompt => {
  const rng = mulberry32(seed);
  const max = Math.min(maxForBand(band), 20);
  const total = pickInt(rng, 3, max);
  const pattern = pickOne(rng, ['dice', 'ten-frame', 'rows'] as const);
  const groups = groupsFor(total, rng);
  const observationKeys = shuffle(rng, OBSERVATION_POOL).slice(0, 4);
  return { kind: 'number-talk', total, pattern, groups, observationKeys: [...observationKeys], seed };
};

export const generateWodb = (band: ExploreBand, seed: number): WodbPrompt => {
  const rng = mulberry32(seed);
  const max = Math.min(maxForBand(band), 12);
  const base = pickInt(rng, 3, Math.max(3, max - 1));
  const arrangements = shuffle(rng, ['line', 'triangle', 'square', 'scatter'] as const);
  const counts = shuffle(rng, [base, base, base + 1, Math.max(1, base - 1)]);
  const options: WodbOption[] = [0, 1, 2, 3].map((i) => {
    const dots = counts[i];
    const arrangement = arrangements[i % arrangements.length];
    const reasonKeys: string[] = [];
    if (dots % 2 === 1) reasonKeys.push('reason_odd_count');
    else reasonKeys.push('reason_even_count');
    if (arrangement === 'square') reasonKeys.push('reason_not_line');
    if (arrangement === 'line') reasonKeys.push('reason_not_square');
    reasonKeys.push('reason_arrangement');
    if (dots === Math.max(...counts)) reasonKeys.push('reason_most');
    if (dots === Math.min(...counts)) reasonKeys.push('reason_least');
    return {
      id: `opt-${i}`,
      dots,
      arrangement,
      reasonKeys: reasonKeys.filter((k, idx, arr) => arr.indexOf(k) === idx),
    };
  });
  // Ensure every option has at least one exclusive-ish justification path.
  const validOptionIds = options.map((o) => o.id);
  return { kind: 'wodb', options, validOptionIds, seed };
};

export const generateMakeTen = (band: ExploreBand, seed: number): MakeTenPrompt => ({
  kind: 'make-ten',
  goal: makeGoalForBand(band),
  seed,
});

export const generateNumberLine = (band: ExploreBand, seed: number): NumberLinePrompt => {
  const rng = mulberry32(seed);
  const max = maxForBand(band);
  const min = 0;
  const hop = band === 'to100' ? 10 : band === 'to20' ? pickOne(rng, [1, 2, 5] as const) : 1;
  const start = pickInt(rng, min, Math.max(min, max - hop));
  let compare = pickInt(rng, min, max);
  if (compare === start) compare = Math.min(max, start + hop);
  return { kind: 'number-line', min, max, start, compare, hop, seed };
};

export const generateBuildStory = (band: ExploreBand, seed: number): BuildStoryPrompt => {
  const rng = mulberry32(seed);
  const max = maxForBand(band);
  const op = pickOne(rng, ['add', 'sub'] as const);
  let a = pickInt(rng, 1, Math.min(max, band === 'to100' ? 40 : max));
  let b = pickInt(rng, 1, Math.min(max, band === 'to100' ? 40 : max));
  if (op === 'sub' && b > a) [a, b] = [b, a];
  if (op === 'add' && a + b > max) {
    b = Math.max(1, max - a);
  }
  const objectKey = pickOne(rng, ['star', 'moon', 'rocket', 'pebble'] as const);
  return { kind: 'build-story', op, a, b, objectKey, seed };
};

export const generatePatternSkip = (band: ExploreBand, seed: number): PatternSkipPrompt => {
  const rng = mulberry32(seed);
  const step = pickOne(rng, [2, 5, 10] as const);
  const max = maxForBand(band);
  const startMax = Math.max(0, Math.min(max - step * 4, step === 10 ? 50 : max - step * 4));
  const start = pickInt(rng, 0, Math.max(0, startMax));
  const sequence = [0, 1, 2, 3, 4].map((i) => start + i * step).filter((n) => n <= max);
  while (sequence.length < 5) {
    sequence.push((sequence[sequence.length - 1] ?? start) + step);
  }
  const mode = rng() < 0.5 ? 'extend' : 'fix';
  let breakIndex = -1;
  if (mode === 'fix') {
    breakIndex = pickInt(rng, 1, 3);
    const bump = pickOne(rng, [1, -1, step + 1] as const);
    sequence[breakIndex] = Math.max(0, sequence[breakIndex] + bump);
  }
  return { kind: 'pattern-skip', step, start, sequence: sequence.slice(0, 5), breakIndex, mode, seed };
};

const GENERATORS: Record<ExploreActivityId, (band: ExploreBand, seed: number) => ExplorePrompt> = {
  'show-me': generateShowMe,
  'quick-look': generateQuickLook,
  'number-talk': generateNumberTalk,
  wodb: generateWodb,
  'make-ten': generateMakeTen,
  'number-line': generateNumberLine,
  'build-story': generateBuildStory,
  'pattern-skip': generatePatternSkip,
};

/**
 * Seeded prompt for an activity. Avoids repeating the previous visit’s signature
 * when a previous signature is supplied (no back-to-back duplicates).
 */
export const generateExplorePrompt = (
  activityId: ExploreActivityId,
  band: ExploreBand,
  entropy: number | string,
  previousSignature?: string | null
): ExplorePrompt => {
  const base = hashSeed(`${activityId}|${band}|${entropy}`);
  let seed = base;
  let prompt = GENERATORS[activityId](band, seed);
  if (previousSignature) {
    for (let i = 0; i < 12 && signatureOf(prompt) === previousSignature; i++) {
      seed = (seed + 0x9e3779b9) >>> 0;
      prompt = GENERATORS[activityId](band, seed);
    }
  }
  return prompt;
};

export const explorePromptSignature = signatureOf;

/** Distinct part–whole pairs (a,b) with a+b = goal, a <= b. */
export const compositionsFor = (goal: number): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let a = 0; a <= goal; a++) {
    const b = goal - a;
    if (a <= b) out.push([a, b]);
  }
  return out;
};

export const isValidComposition = (goal: number, a: number, b: number): boolean =>
  a >= 0 && b >= 0 && a + b === goal;

export const isValidWodbChoice = (prompt: WodbPrompt, optionId: string): boolean =>
  prompt.validOptionIds.includes(optionId);

/** Reasons that apply to a chosen WODB option (multiple may be valid). */
export const reasonsForWodbOption = (prompt: WodbPrompt, optionId: string): string[] => {
  const option = prompt.options.find((o) => o.id === optionId);
  if (!option) return [];
  return option.reasonKeys.filter((k) => (WODB_REASONS as readonly string[]).includes(k));
};

export const patternExpectedNext = (prompt: PatternSkipPrompt): number =>
  prompt.start + prompt.sequence.length * prompt.step;

export const patternBrokenValue = (prompt: PatternSkipPrompt): number | null => {
  if (prompt.mode !== 'fix' || prompt.breakIndex < 0) return null;
  return prompt.sequence[prompt.breakIndex] ?? null;
};

/** True if value fits the skip pattern at index. */
export const fitsSkipPattern = (prompt: PatternSkipPrompt, index: number, value: number): boolean =>
  prompt.start + index * prompt.step === value;
