import { PATHS } from '@/content/catalog';
import type { GeneratorId, Path, PathNode, PathTheme } from '@/content/types';
import { PLANET_ORDER, type PlanetId, type SolarPathId } from '@/lib/planets';

/** Topic ids used across solar systems and the 3-topic builder. */
export type TopicId =
  | 'counting'
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'algebra'
  | 'place-value'
  | 'hundreds'
  | 'compare-order'
  | 'length'
  | 'time'
  | 'money'
  | 'shapes'
  | 'perimeter'
  | 'area'
  | 'equal-shares'
  | 'halves-quarters'
  | 'fractions-group'
  | 'sorting'
  | 'picture-graphs'
  | 'bar-graphs'
  | 'patterns'
  | 'skip-counting'
  | 'number-rules';

export interface SolarSystem {
  id: string;
  /** Legacy path id used in learner / classroom docs (foundations, operations, …). */
  legacyPathId: SolarPathId | string;
  nameKey: string;
  summaryKey: string;
  topics: [TopicId, TopicId, TopicId];
  theme: PathTheme;
  /** When true, hidden from children until answer audits pass. */
  comingSoon?: boolean;
  nodes: PathNode[];
}

export const TOPIC_START_INDICES = [0, 3, 6] as const;

export const topicStartPlanets = (): PlanetId[] =>
  TOPIC_START_INDICES.map((index) => PLANET_ORDER[index]);

export const isTopicStartPlanet = (planetId: string): boolean =>
  topicStartPlanets().includes(planetId as PlanetId);

const theme = (id: string, accent: string, surface: string, ink: string): PathTheme => ({
  id,
  accent,
  surface,
  ink,
});

const bandTopics = (topics: [TopicId, TopicId, TopicId]): TopicId[] => [
  topics[0],
  topics[0],
  topics[0],
  topics[1],
  topics[1],
  topics[1],
  topics[2],
  topics[2],
  topics[2],
];

const rampTiers = (indexInBand: number): Array<1 | 2 | 3> => {
  if (indexInBand === 0) return [1];
  if (indexInBand === 1) return [1, 2];
  return [2, 3];
};

/** Map a curriculum topic to a generator that can produce problems today. */
export const generatorForTopic = (topic: TopicId): GeneratorId => {
  switch (topic) {
    case 'counting':
      return 'counting';
    case 'addition':
    case 'compare-order':
      return 'addition';
    case 'subtraction':
      return 'subtraction';
    case 'multiplication':
    case 'skip-counting':
    case 'patterns':
    case 'number-rules':
      return 'multiplication';
    case 'division':
    case 'equal-shares':
    case 'halves-quarters':
    case 'fractions-group':
      return 'division';
    case 'algebra':
    case 'place-value':
    case 'hundreds':
      return 'algebra';
    case 'shapes':
    case 'perimeter':
    case 'area':
    case 'length':
    case 'time':
    case 'money':
    case 'sorting':
    case 'picture-graphs':
    case 'bar-graphs':
      return 'geometry';
    default:
      return 'addition';
  }
};

export const buildSolarNodes = (
  systemId: string,
  topics: [TopicId, TopicId, TopicId],
  options?: { legacy?: boolean }
): PathNode[] => {
  const assigned = bandTopics(topics);
  return PLANET_ORDER.map((planetId, index) => {
    const topic = assigned[index];
    const bandIndex = index % 3;
    if (options?.legacy && systemId === 'ss1') {
      return {
        id: planetId,
        order: index + 1,
        titleKey: `ui:planet_${planetId}`,
        prerequisites: index === 0 ? [] : [PLANET_ORDER[index - 1]],
        topics: [topic],
        masteryThreshold: 80,
        source: { kind: 'legacy', planetId },
      };
    }
    return {
      id: planetId,
      order: index + 1,
      titleKey: `ui:planet_${planetId}`,
      prerequisites: index === 0 ? [] : [PLANET_ORDER[index - 1]],
      topics: [topic],
      masteryThreshold: 80,
      source: {
        kind: 'generated',
        generatorId: generatorForTopic(topic),
        tiers: rampTiers(bandIndex),
        perTier: 4,
      },
    };
  });
};

const fromPath = (path: Path, solarId: string, topics: [TopicId, TopicId, TopicId]): SolarSystem => ({
  id: solarId,
  legacyPathId: path.id,
  nameKey: path.titleKey,
  summaryKey: path.summaryKey,
  topics,
  theme: path.theme,
  nodes: path.nodes,
});

const foundations = PATHS.find((path) => path.id === 'foundations')!;

/**
 * One live classroom solar system (SS1). Extra pathway drafts stay coming-soon
 * and are never shown to teachers or students.
 */
export const SOLAR_SYSTEMS: SolarSystem[] = [
  fromPath(foundations, 'ss1', ['counting', 'addition', 'subtraction']),
  {
    id: 'ss2',
    legacyPathId: 'operations',
    nameKey: 'paths:path_operations',
    summaryKey: 'paths:path_operations_lead',
    topics: ['multiplication', 'division', 'algebra'],
    theme: theme('ss2', '28 70% 52%', '24 24% 14%', '30 40% 96%'),
    comingSoon: true,
    nodes: buildSolarNodes('ss2', ['multiplication', 'division', 'algebra']),
  },
  {
    id: 'ss3',
    legacyPathId: 'ss3',
    nameKey: 'paths:ss3_name',
    summaryKey: 'paths:ss3_lead',
    topics: ['place-value', 'hundreds', 'compare-order'],
    theme: theme('ss3', '210 55% 48%', '210 22% 14%', '210 30% 96%'),
    comingSoon: true,
    nodes: buildSolarNodes('ss3', ['place-value', 'hundreds', 'compare-order']),
  },
  {
    id: 'ss4',
    legacyPathId: 'ss4',
    nameKey: 'paths:ss4_name',
    summaryKey: 'paths:ss4_lead',
    topics: ['length', 'time', 'money'],
    theme: theme('ss4', '150 40% 42%', '150 20% 14%', '150 30% 96%'),
    comingSoon: true,
    nodes: buildSolarNodes('ss4', ['length', 'time', 'money']),
  },
  {
    id: 'ss5',
    legacyPathId: 'ss5',
    nameKey: 'paths:ss5_name',
    summaryKey: 'paths:ss5_lead',
    topics: ['shapes', 'perimeter', 'area'],
    theme: theme('ss5', '338 55% 52%', '330 18% 14%', '340 30% 96%'),
    comingSoon: true,
    nodes: buildSolarNodes('ss5', ['shapes', 'perimeter', 'area']),
  },
  {
    id: 'ss6',
    legacyPathId: 'ss6',
    nameKey: 'paths:ss6_name',
    summaryKey: 'paths:ss6_lead',
    topics: ['equal-shares', 'halves-quarters', 'fractions-group'],
    theme: theme('ss6', '280 40% 52%', '280 18% 14%', '280 30% 96%'),
    comingSoon: true,
    nodes: buildSolarNodes('ss6', ['equal-shares', 'halves-quarters', 'fractions-group']),
  },
  {
    id: 'ss7',
    legacyPathId: 'ss7',
    nameKey: 'paths:ss7_name',
    summaryKey: 'paths:ss7_lead',
    topics: ['sorting', 'picture-graphs', 'bar-graphs'],
    theme: theme('ss7', '25 70% 50%', '25 22% 14%', '30 40% 96%'),
    comingSoon: true,
    nodes: buildSolarNodes('ss7', ['sorting', 'picture-graphs', 'bar-graphs']),
  },
  {
    id: 'ss8',
    legacyPathId: 'ss8',
    nameKey: 'paths:ss8_name',
    summaryKey: 'paths:ss8_lead',
    topics: ['patterns', 'skip-counting', 'number-rules'],
    theme: theme('ss8', '190 50% 42%', '190 20% 13%', '190 30% 96%'),
    comingSoon: true,
    nodes: buildSolarNodes('ss8', ['patterns', 'skip-counting', 'number-rules']),
  },
];

/** Only SS1 is live — one solar system for the class. */
export const LIVE_SOLAR_SYSTEMS: SolarSystem[] = SOLAR_SYSTEMS.filter((system) => !system.comingSoon);

export const getSolarSystem = (id: string | null | undefined): SolarSystem | null =>
  SOLAR_SYSTEMS.find((system) => system.id === id || system.legacyPathId === id) ?? null;

/** Every stored path id resolves to the single live system (SS1). */
export const resolveSolarSystemId = (_pathId?: string | null): string => 'ss1';

export const resolveSolarSystem = (pathId: string | null | undefined): SolarSystem =>
  getSolarSystem(resolveSolarSystemId(pathId)) ?? LIVE_SOLAR_SYSTEMS[0];

/** Path id to store on classroom / learner docs. */
export const legacyPathIdForSolar = (_solarId?: string): string => 'foundations';

export const topicLabelKey = (topic: TopicId): string => {
  const known: Partial<Record<TopicId, string>> = {
    counting: 'ui:topic_counting',
    addition: 'ui:topic_addition',
    subtraction: 'ui:topic_subtraction',
    multiplication: 'ui:topic_multiplication',
    division: 'ui:topic_division',
    algebra: 'ui:topic_algebra',
  };
  if (known[topic]) return known[topic]!;
  return `paths:topic_${topic.replace(/-/g, '_')}`;
};

/** Topics the 3-topic builder may choose from (live generators only). */
export const BUILDER_TOPICS: TopicId[] = [
  'counting',
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'algebra',
];
