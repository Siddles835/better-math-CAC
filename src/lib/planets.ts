import type { LessonType, StudentState } from '@/lib/classroom';

export type PlanetId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export const PLANET_ORDER: PlanetId[] = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
];

export const PLANET_META: Record<
  PlanetId,
  { name: string; color: string }
> = {
  sun: { name: 'Sun', color: '#ffd166' },
  mercury: { name: 'Mercury', color: '#c7b89a' },
  venus: { name: 'Venus', color: '#f3d1b3' },
  earth: { name: 'Earth', color: '#8ecae6' },
  mars: { name: 'Mars', color: '#f28b6b' },
  jupiter: { name: 'Jupiter', color: '#d9c5a6' },
  saturn: { name: 'Saturn', color: '#e9d6b2' },
  uranus: { name: 'Uranus', color: '#bde0fe' },
  neptune: { name: 'Neptune', color: '#7aa2f7' },
};

export const getPlanetIndex = (planetId: string): number => {
  const idx = PLANET_ORDER.indexOf(planetId as PlanetId);
  return idx === -1 ? 0 : idx;
};

export const getLessonForPlanet = (planetId: string): LessonType => {
  if (['earth', 'mars', 'jupiter'].includes(planetId)) return 'addition';
  if (['saturn', 'uranus', 'neptune'].includes(planetId)) return 'subtraction';
  return 'counting';
};

export const getLessonRoute = (planetId: string): string => {
  const lesson = getLessonForPlanet(planetId);
  return `/lesson/${lesson}/${planetId}`;
};

/** Furthest checkpoint from saved progress (not replay-only UI state). */
export const getFurthestProgressPlanet = (
  student: Pick<StudentState, 'planet' | 'completedPlanets' | 'planetSteps'>
): PlanetId => {
  let maxIndex = getPlanetIndex(student.planet);
  for (const id of student.completedPlanets ?? []) {
    maxIndex = Math.max(maxIndex, getPlanetIndex(id));
  }
  for (const [planet, step] of Object.entries(student.planetSteps ?? {})) {
    if (step > 0 && PLANET_ORDER.includes(planet as PlanetId)) {
      maxIndex = Math.max(maxIndex, getPlanetIndex(planet));
    }
  }
  return PLANET_ORDER[maxIndex];
};

/** Planet with the highest saved in-lesson step, if any. */
export const getInProgressPlanet = (
  planetSteps: Record<string, number> | undefined
): PlanetId | null => {
  let best: PlanetId | null = null;
  let bestIndex = -1;
  for (const [planet, step] of Object.entries(planetSteps ?? {})) {
    if (step > 0 && PLANET_ORDER.includes(planet as PlanetId)) {
      const idx = getPlanetIndex(planet);
      if (idx > bestIndex) {
        bestIndex = idx;
        best = planet as PlanetId;
      }
    }
  }
  return best;
};

/** Teacher default caps how far along the solar system students may choose. */
export const getClassMaxPlanetIndex = (maxPlanetId?: string): number => {
  if (!maxPlanetId) return 0;
  return getPlanetIndex(maxPlanetId);
};

/**
 * Whether a planet appears on the ring and can be launched.
 * - Teacher max: students cannot skip ahead of the class default on first access.
 * - Student progress: completing planets unlocks the next world on the ring too
 *   (e.g. teacher default Mars, but Jupiter shows after Mars is finished).
 */
export const canSelectPlanet = (
  planetId: string,
  options: {
    classMaxPlanetId?: string;
    progressPlanetId: string;
  }
): boolean => {
  const index = getPlanetIndex(planetId);
  const teacherMax = getClassMaxPlanetIndex(options.classMaxPlanetId ?? 'sun');
  const progressIndex = getPlanetIndex(options.progressPlanetId);
  const visibleMax = Math.max(teacherMax, progressIndex);
  return index <= visibleMax;
};

export const buildCompletedMap = (
  progressPlanetId: string,
  completedList: string[] = []
): Record<PlanetId, boolean> => {
  const map = PLANET_ORDER.reduce(
    (acc, id) => {
      acc[id] = false;
      return acc;
    },
    {} as Record<PlanetId, boolean>
  );

  completedList.forEach((id) => {
    if (id in map) map[id as PlanetId] = true;
  });

  const progressIndex = getPlanetIndex(progressPlanetId);
  for (let i = 0; i < progressIndex; i++) {
    map[PLANET_ORDER[i]] = true;
  }

  return map;
};
