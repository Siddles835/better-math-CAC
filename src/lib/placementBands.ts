import { PATHS, getPath } from '@/content/catalog';
import type { AssessmentSummary, GeneratorId, SkillBand } from '@/content/types';
import { generatePathItem } from '@/lib/paths/generators';
import {
  PLACEMENT_BANK,
  PLACEMENT_LEVELS,
  createStaircase,
  nextStaircaseState,
  planetForClearedLevel,
  type PlacementOutcome,
  type PlacementQuestion,
  type StaircaseConfig,
  type StaircaseState,
} from '@/lib/placement';

const foundationNode: Record<string, string> = {
  count10: 'sun',
  count20: 'mercury',
  count100: 'venus',
  add10: 'earth',
  add20: 'mars',
  placeValue: 'jupiter',
  sub10: 'saturn',
  sub20: 'uranus',
};

export const FOUNDATION_BANDS: SkillBand[] = PLACEMENT_LEVELS.map((id, order) => ({
  id,
  pathId: 'foundations',
  topic: id.startsWith('count') ? 'counting' : id.startsWith('add') || id === 'placeValue' ? 'addition' : 'subtraction',
  order,
  nodeId: foundationNode[id] ?? 'sun',
  generatorId: 'counting',
  tier: 1,
  placementLevel: id,
}));

const extraBands = (): SkillBand[] => {
  const out: SkillBand[] = [];
  for (const path of PATHS) {
    if (path.id === 'foundations') continue;
    path.nodes.slice(0, 3).forEach((node, index) => {
      const generatorId = (node.source.kind === 'generated' ? node.source.generatorId : 'addition') as GeneratorId;
      out.push({
        id: `${path.id}-band-${index + 1}`,
        pathId: path.id,
        topic: node.topics[0] ?? path.id,
        order: index,
        nodeId: node.id,
        generatorId,
        tier: (index + 1) as 1 | 2 | 3,
      });
    });
  }
  return out;
};

export const ALL_BANDS: SkillBand[] = [...FOUNDATION_BANDS, ...extraBands()];

export const bandsForPath = (pathId: string): SkillBand[] => {
  if (pathId === 'foundations') return FOUNDATION_BANDS;
  const path = getPath(pathId);
  if (!path) return FOUNDATION_BANDS;
  return path.nodes.map((node, index) => ({
    id: `${path.id}-node-band-${index + 1}`,
    pathId: path.id,
    topic: node.topics[node.topics.length - 1] ?? path.id,
    order: index,
    nodeId: node.id,
    generatorId: (node.source.kind === 'generated' ? node.source.generatorId : 'addition') as GeneratorId,
    tier: ((index % 3) + 1) as 1 | 2 | 3,
  }));
};

export const bandsForScope = (scope: string): SkillBand[] =>
  scope === 'all' ? ALL_BANDS : bandsForPath(scope);

/**
 * Next item for a skill band. Prefers unused bank ids so the check does not
 * loop the same dots / equation when the staircase stays on one band.
 */
export const questionForBand = (
  band: SkillBand,
  itemIndex: number,
  usedIds: ReadonlySet<string> = new Set()
): PlacementQuestion => {
  if (band.placementLevel) {
    const pool = PLACEMENT_BANK.filter((item) => item.level === band.placementLevel);
    const fresh = pool.find((item) => !usedIds.has(item.id));
    if (fresh) return fresh;
    // All bank items used: synthesize a new counting prompt with a free answer.
    if (band.placementLevel === 'count10' || band.placementLevel === 'count20') {
      const lo = band.placementLevel === 'count10' ? 2 : 11;
      const hi = band.placementLevel === 'count10' ? 10 : 20;
      const taken = new Set(
        [...usedIds]
          .map((id) => pool.find((item) => item.id === id)?.answer)
          .filter((n): n is number => typeof n === 'number')
      );
      for (let n = lo; n <= hi; n += 1) {
        if (taken.has(n)) continue;
        const id = `${band.id}-extra-${n}`;
        if (usedIds.has(id)) continue;
        return {
          id,
          level: band.placementLevel,
          promptKey: 'place_q_count',
          dots: n,
          answer: n,
          choices: [n - 1, n, n + 1, n + 2].map((v) => Math.max(0, v)),
        };
      }
    }
    return pool[itemIndex % Math.max(pool.length, 1)] ?? PLACEMENT_BANK[0];
  }

  // Generated bands: bump the seed until the answer (or id) is new.
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const seed = (itemIndex + 1 + attempt) * 17 + band.order * 1009 + attempt * 97;
    const { problem } = generatePathItem(band.generatorId, band.tier, seed);
    const answer = Number(problem.answer);
    const id = `${band.id}-${itemIndex}-${attempt}`;
    if (usedIds.has(id)) continue;
    const isCount = problem.operator === 'count' || band.generatorId === 'counting';
    const choices = (
      problem.choices ?? [String(Math.max(0, answer - 1)), problem.answer, String(answer + 1), String(answer + 2)]
    ).map(Number);
    const question: PlacementQuestion = {
      id,
      level: 'count10',
      promptKey: isCount ? 'place_q_count' : problem.promptKey ?? 'paths:q_solve',
      promptValues: isCount ? undefined : problem.promptValues,
      equation: isCount ? undefined : problem.equation,
      dots: isCount ? answer : undefined,
      answer,
      choices,
    };
    // Skip duplicate counting amounts already shown this run.
    if (isCount && [...usedIds].some((used) => used.endsWith(`-${answer}`) || used.includes(`-extra-${answer}`))) {
      continue;
    }
    return question;
  }
  const seed = (itemIndex + 1) * 17 + band.order * 1009;
  const { problem } = generatePathItem(band.generatorId, band.tier, seed);
  const answer = Number(problem.answer);
  const isCount = problem.operator === 'count' || band.generatorId === 'counting';
  return {
    id: `${band.id}-${itemIndex}`,
    level: 'count10',
    promptKey: isCount ? 'place_q_count' : problem.promptKey ?? 'paths:q_solve',
    promptValues: isCount ? undefined : problem.promptValues,
    equation: isCount ? undefined : problem.equation,
    dots: isCount ? answer : undefined,
    answer,
    choices: (
      problem.choices ?? [String(Math.max(0, answer - 1)), problem.answer, String(answer + 1), String(answer + 2)]
    ).map(Number),
  };
};

export const runBandStaircase = (
  bandCount: number,
  outcomes: PlacementOutcome[],
  config: Partial<StaircaseConfig> = {}
): StaircaseState => {
  let state = createStaircase(
    {
      minItems: 12,
      maxItems: Math.max(16, bandCount * 2),
      successThreshold: 2,
      missThreshold: 2,
      ...config,
    },
    bandCount
  );
  let i = 0;
  while (!state.done) {
    const outcome = outcomes[Math.min(i, Math.max(outcomes.length - 1, 0))] ?? 'incorrect';
    i += 1;
    if (outcome === 'unreadable' && i > 40) break;
    state = nextStaircaseState(state, outcome);
  }
  return state;
};

export const summarizeBands = (
  bands: SkillBand[],
  clearedIndex: number,
  at = 0
): AssessmentSummary => {
  const cleared = clearedIndex >= 0 ? bands[Math.min(clearedIndex, bands.length - 1)] : null;
  const byPath: AssessmentSummary['byPath'] = {};
  const strengths: string[] = [];
  const practiceTopics: string[] = [];
  for (const band of bands) {
    const bucket = byPath[band.pathId] ?? { clearedBandId: null, topics: {} };
    const bandIndex = bands.indexOf(band);
    if (bandIndex <= clearedIndex) {
      bucket.clearedBandId = band.id;
      bucket.topics[band.topic] = 'strength';
      if (!strengths.includes(band.topic)) strengths.push(band.topic);
    } else if (bandIndex === clearedIndex + 1 || (clearedIndex < 0 && bandIndex === 0)) {
      bucket.topics[band.topic] = 'practice';
      if (!practiceTopics.includes(band.topic)) practiceTopics.push(band.topic);
    } else if (!bucket.topics[band.topic]) {
      bucket.topics[band.topic] = 'not-checked';
    }
    byPath[band.pathId] = bucket;
  }
  const recommendedPathId = cleared?.pathId ?? 'foundations';
  const recommendedNodeId =
    cleared?.nodeId ??
    (recommendedPathId === 'foundations' ? planetForClearedLevel(clearedIndex) : bands[0]?.nodeId ?? 'sun');
  return {
    id: `assess-${at || clearedIndex}`,
    at,
    recommendedPathId,
    recommendedNodeId,
    clearedIndex,
    byPath,
    strengths,
    practiceTopics,
  };
};

export const skippedAssessment = (at = 0): AssessmentSummary => ({
  id: `assess-skip-${at}`,
  at,
  recommendedPathId: 'foundations',
  recommendedNodeId: 'sun',
  clearedIndex: -1,
  byPath: {},
  strengths: [],
  practiceTopics: [],
});
