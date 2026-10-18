import { PATHS, TOPIC_PATHS } from '@/content/catalog';
import { LIVE_SOLAR_SYSTEMS } from '@/content/solarSystems';
import { getLessonForPlanet, PLANET_ORDER, type PlanetId } from '@/lib/planets';
import { PLANET_LEVELS } from '@/lib/planetLevels';

/**
 * Explicit inventory of student-facing pathways.
 *
 * Only foundations is offered in PickPath / classroom join. TOPIC_PATHS remain
 * for the curriculum editor and are not student-facing foundations.
 */
export interface PathwayInventoryEntry {
  id: string;
  nameKey: string;
  studentFacing: boolean;
  objectives: string[];
  topics: string[];
  planetOrder: PlanetId[];
  lessons: Array<{ planet: PlanetId; topic: string; route: string; rangeMax: number }>;
  placement: 'foundations-level-check' | 'band-check' | 'none';
  masteryThreshold: number;
  progressKey: string;
}

export const studentFacingPathIds = (): string[] => PATHS.map((path) => path.id);

export const foundationsInventory = (): PathwayInventoryEntry => {
  const path = PATHS.find((item) => item.id === 'foundations') ?? PATHS[0];
  return {
    id: 'foundations',
    nameKey: path?.titleKey ?? 'paths:path_foundations',
    studentFacing: true,
    objectives: ['counting', 'addition', 'subtraction'],
    topics: LIVE_SOLAR_SYSTEMS[0]?.topics ?? ['counting', 'addition', 'subtraction'],
    planetOrder: [...PLANET_ORDER],
    lessons: PLANET_ORDER.map((planet) => {
      const topic = getLessonForPlanet(planet);
      return {
        planet,
        topic,
        route: `/lesson/${topic}/${planet}`,
        rangeMax: PLANET_LEVELS[planet].rangeMax,
      };
    }),
    placement: 'foundations-level-check',
    masteryThreshold: path?.nodes[0]?.masteryThreshold ?? 80,
    progressKey: 'foundations',
  };
};

export const pathwayInventory = (): PathwayInventoryEntry[] => {
  const live = [foundationsInventory()];
  // Topic templates are editor-only — never listed as student-facing pathways.
  const editorOnly = TOPIC_PATHS.map((path) => ({
    id: path.id,
    nameKey: path.titleKey,
    studentFacing: false,
    objectives: path.nodes.map((node) => node.topics[0] ?? path.id),
    topics: [...new Set(path.nodes.flatMap((node) => node.topics))],
    planetOrder: [] as PlanetId[],
    lessons: [],
    placement: 'band-check' as const,
    masteryThreshold: path.nodes[0]?.masteryThreshold ?? 80,
    progressKey: path.id,
  }));
  return [...live, ...editorOnly];
};

export const isStudentFacingPathway = (pathId: string): boolean =>
  studentFacingPathIds().includes(pathId);
