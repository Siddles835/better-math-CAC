import type { GeneratorId, Path, PathNode, PathTheme } from '@/content/types';
import {
  PLANET_ORDER,
  getLessonForPlanet,
  isSolarPathId,
  type PlanetId,
  type SolarPathId,
} from '@/lib/planets';

const theme = (id: string, accent: string, surface: string, ink: string): PathTheme => ({
  id,
  accent,
  surface,
  ink,
});

const generatedNodes = (
  pathId: string,
  generatorId: GeneratorId,
  topics: string[][]
): PathNode[] =>
  topics.map((topicList, index) => ({
    id: `${pathId}-${index + 1}`,
    order: index + 1,
    titleKey: `paths:${pathId}_node_${index + 1}`,
    prerequisites: index === 0 ? [] : [`${pathId}-${index}`],
    topics: topicList,
    masteryThreshold: 80,
    source: { kind: 'generated', generatorId, tiers: [1, 2, 3], perTier: 2 },
  }));

const foundationsNodes = (): PathNode[] =>
  PLANET_ORDER.map((planetId, index) => ({
    id: planetId,
    order: index + 1,
    titleKey: `ui:planet_${planetId}`,
    prerequisites: index === 0 ? [] : [PLANET_ORDER[index - 1]],
    topics: [getLessonForPlanet(planetId, 'foundations')],
    masteryThreshold: 80,
    source: { kind: 'legacy' as const, planetId: planetId as PlanetId },
  }));

/**
 * The one classroom / student solar system:
 * Counting, Addition, Subtraction across Sun → Neptune.
 * Teachers only choose the starting planet.
 */
export const PATHS: Path[] = [
  {
    id: 'foundations',
    titleKey: 'paths:path_foundations',
    summaryKey: 'paths:path_foundations_lead',
    theme: theme('foundations', '45 80% 56%', '230 25% 16%', '40 30% 96%'),
    nodes: foundationsNodes(),
  },
];

/**
 * Topic templates for the curriculum editor (duplicate / remix).
 * Not shown to students joining a classroom.
 */
export const TOPIC_PATHS: Path[] = [
  {
    id: 'addition',
    titleKey: 'paths:path_addition',
    summaryKey: 'paths:path_addition_lead',
    theme: theme('addition', '152 42% 42%', '160 20% 14%', '150 30% 96%'),
    nodes: generatedNodes('addition', 'addition', [
      ['addition', 'within-10'],
      ['addition', 'make-ten'],
      ['addition', 'within-20'],
      ['addition', 'missing-part'],
      ['addition', 'mixed'],
    ]),
  },
  {
    id: 'subtraction',
    titleKey: 'paths:path_subtraction',
    summaryKey: 'paths:path_subtraction_lead',
    theme: theme('subtraction', '200 45% 48%', '210 22% 14%', '200 30% 96%'),
    nodes: generatedNodes('subtraction', 'subtraction', [
      ['subtraction', 'within-10'],
      ['subtraction', 'difference'],
      ['subtraction', 'within-20'],
      ['subtraction', 'compare'],
      ['subtraction', 'mixed'],
    ]),
  },
  {
    id: 'multiplication',
    titleKey: 'paths:path_multiplication',
    summaryKey: 'paths:path_multiplication_lead',
    theme: theme('multiplication', '28 70% 52%', '24 24% 14%', '30 40% 96%'),
    nodes: generatedNodes('multiplication', 'multiplication', [
      ['multiplication', 'groups'],
      ['multiplication', 'facts'],
      ['multiplication', 'larger'],
      ['multiplication', 'missing-factor'],
      ['multiplication', 'mixed'],
    ]),
  },
  {
    id: 'division',
    titleKey: 'paths:path_division',
    summaryKey: 'paths:path_division_lead',
    theme: theme('division', '262 42% 58%', '260 20% 16%', '260 30% 96%'),
    nodes: generatedNodes('division', 'division', [
      ['division', 'share'],
      ['division', 'facts'],
      ['division', 'larger'],
      ['division', 'missing-group'],
      ['division', 'mixed'],
    ]),
  },
  {
    id: 'algebra',
    titleKey: 'paths:path_algebra',
    summaryKey: 'paths:path_algebra_lead',
    theme: theme('algebra', '188 55% 42%', '190 22% 13%', '180 30% 96%'),
    nodes: generatedNodes('algebra', 'algebra', [
      ['algebra', 'add-unknown'],
      ['algebra', 'balance'],
      ['algebra', 'scale-unknown'],
      ['algebra', 'missing-addend'],
      ['algebra', 'mixed'],
    ]),
  },
  {
    id: 'geometry',
    titleKey: 'paths:path_geometry',
    summaryKey: 'paths:path_geometry_lead',
    theme: theme('geometry', '338 55% 52%', '330 18% 14%', '340 30% 96%'),
    nodes: generatedNodes('geometry', 'geometry', [
      ['geometry', 'perimeter'],
      ['geometry', 'area'],
      ['geometry', 'angles'],
      ['geometry', 'missing-side'],
      ['geometry', 'mixed'],
    ]),
  },
];

/** Paths a teacher can assign as the class solar-system pathway. */
export const CLASSROOM_PATHS: Path[] = PATHS;

/** Curriculum "based on" list: classroom pathways + topic templates. */
export const CURRICULUM_BASE_PATHS: Path[] = [...PATHS, ...TOPIC_PATHS];

/** Any stored pathway id folds onto the single foundations solar system. */
const PATH_ALIASES: Record<string, SolarPathId> = {
  foundations: 'foundations',
  operations: 'foundations',
  ss1: 'foundations',
  ss2: 'foundations',
  counting: 'foundations',
  addition: 'foundations',
  subtraction: 'foundations',
  multiplication: 'foundations',
  division: 'foundations',
  algebra: 'foundations',
  geometry: 'foundations',
};

export const resolveClassroomPathId = (id: string | null | undefined): SolarPathId => {
  if (!id || id === 'all') return 'foundations';
  if (isSolarPathId(id)) return id;
  return PATH_ALIASES[id] ?? 'foundations';
};

export const getPath = (id: string | null | undefined): Path | null => {
  if (!id) return null;
  const exact =
    PATHS.find((path) => path.id === id) ?? TOPIC_PATHS.find((path) => path.id === id);
  if (exact) return exact;
  const aliased = PATH_ALIASES[id];
  return aliased ? PATHS.find((path) => path.id === aliased) ?? null : null;
};

export const getPathOrFoundations = (id: string | null | undefined): Path =>
  getPath(id) ?? PATHS[0];

export const getClassroomPath = (id: string | null | undefined): Path =>
  PATHS.find((path) => path.id === resolveClassroomPathId(id)) ?? PATHS[0];
