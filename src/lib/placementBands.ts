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

export const questionForBand = (band: SkillBand, itemIndex: number): PlacementQuestion => {
  if (band.placementLevel) {
    const pool = PLACEMENT_BANK.filter((item) => item.level === band.placementLevel);
    return pool[itemIndex % Math.max(pool.length, 1)] ?? PLACEMENT_BANK[0];
  }
  const seed = (itemIndex + 1) * 17 + band.order * 1009;
  const { problem } = generatePathItem(band.generatorId, band.tier, seed);
  const answer = Number(problem.answer);
  const choices = (problem.choices ?? [String(Math.max(0, answer - 1)), problem.answer, String(answer + 1), String(answer + 2)])
    .map(Number);
  return {
    id: `${band.id}-${itemIndex}`,
    level: 'count10',
    promptKey: problem.promptKey ?? 'paths:q_solve',
    equation: problem.equation,
    answer,
    choices,
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
