import type { PlanetId } from '@/lib/planets';
import { buildPersonalPath, type PathItem } from '@/lib/cognition/personalPath';
import type { Diagnosis, MisconceptionCode } from '@/lib/cognition/types';

/** Estimated seconds for one activity. These are planning estimates, not times measured with children. */
export const ACTIVITY_SECONDS = {
  teach: 90,
  watch: 110,
  build: 85,
  draw: 80,
  story: 95,
  quiz: 120,
  drill: 70,
  break: 50,
  challenge: 85,
  celebrate: 40,
} as const;

export type ActivityKind = keyof typeof ACTIVITY_SECONDS;

/** Extra steps inserted before the celebration or quiz on every planet. */
export const INSERTED_PLAN: ActivityKind[] = [
  'teach',
  'teach',
  'drill',
  'drill',
  'drill',
  'drill',
  'drill',
  'drill',
  'break',
  'drill',
  'drill',
  'challenge',
];

const CORE: Record<PlanetId, ActivityKind[]> = {
  sun: ['build', 'teach', 'draw', 'celebrate'],
  mercury: ['story', 'celebrate'],
  venus: ['teach', 'quiz', 'celebrate'],
  earth: ['watch', 'build', 'draw', 'celebrate'],
  mars: ['story', 'build'],
  jupiter: ['teach', 'quiz', 'celebrate'],
  saturn: ['watch', 'build', 'story', 'celebrate'],
  uranus: ['story', 'build'],
  neptune: ['teach', 'quiz', 'celebrate'],
};

const MAX_NUMBER: Record<PlanetId, number> = {
  sun: 10,
  mercury: 10,
  venus: 12,
  earth: 12,
  mars: 20,
  jupiter: 100,
  saturn: 12,
  uranus: 20,
  neptune: 20,
};

const FOCUS: Record<PlanetId, MisconceptionCode> = {
  sun: 'COUNT_ALL',
  mercury: 'COUNT_ALL',
  venus: 'WORD_GAP',
  earth: 'OVERSHOOT',
  mars: 'COMMUTE',
  jupiter: 'PLACE_SPLIT',
  saturn: 'SUB_FLIP',
  uranus: 'SUB_FLIP',
  neptune: 'SUB_FLIP',
};

export const insertedCount = INSERTED_PLAN.length;

export const planetActivities = (planet: PlanetId): ActivityKind[] => {
  const core = CORE[planet];
  const finale = core[core.length - 1] === 'celebrate' ? core.slice(0, -1) : core;
  const ending: ActivityKind[] = core[core.length - 1] === 'celebrate' ? ['celebrate'] : [];
  return [...finale, ...INSERTED_PLAN, ...ending];
};

export const estimatedSeconds = (planet: PlanetId): number =>
  planetActivities(planet).reduce((sum, kind) => sum + ACTIVITY_SECONDS[kind], 0);

const diagnosis = (planet: PlanetId): Diagnosis => ({
  primary: FOCUS[planet],
  confidence: 0.5,
  scores: [],
  glowPlanets: [],
  nextPlanet: planet,
  kidLine: '',
  teacherLine: '',
  earlyWarning: null,
  updatedAt: 0,
});

export const drillItem = (planet: PlanetId, index: number, entropy: number): PathItem => {
  const path = buildPersonalPath('lesson', diagnosis(planet), planet, {
    round: index,
    entropy,
    accuracy: planet === 'jupiter' ? 1 : 0.25,
    maxNumber: MAX_NUMBER[planet],
  });
  return path.items[index % Math.max(1, path.items.length - 1)];
};
