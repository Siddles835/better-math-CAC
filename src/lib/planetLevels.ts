import type { LessonType } from '@/lib/classroom';
import {
  getLessonForPlanet,
  PLANET_ORDER,
  type PlanetId,
} from '@/lib/planets';

/**
 * Teacher-facing planet level metadata.
 *
 * Number ranges match `MAX_NUMBER` in `lessonDuration.ts` (inserted drills /
 * personal-path practice). Core lesson demos are often smaller; the advertised
 * range is the highest number children actually practice on that planet.
 */
export interface PlanetLevelInfo {
  id: PlanetId;
  topic: LessonType;
  /** Inclusive upper bound practiced on this planet. */
  rangeMax: number;
  /** Short range phrase key, e.g. "numbers to 10". */
  rangeKey: string;
  /** One example skill key for teachers. */
  skillKey: string;
  /** Plain-language label for dropdowns / recommendations. */
  labelKey: string;
}

export const PLANET_LEVELS: Record<PlanetId, PlanetLevelInfo> = {
  sun: {
    id: 'sun',
    topic: 'counting',
    rangeMax: 10,
    rangeKey: 'pl_range_to10',
    skillKey: 'pl_skill_sun',
    labelKey: 'pl_label_sun',
  },
  mercury: {
    id: 'mercury',
    topic: 'counting',
    rangeMax: 10,
    rangeKey: 'pl_range_to10',
    skillKey: 'pl_skill_mercury',
    labelKey: 'pl_label_mercury',
  },
  venus: {
    id: 'venus',
    topic: 'counting',
    rangeMax: 12,
    rangeKey: 'pl_range_to12',
    skillKey: 'pl_skill_venus',
    labelKey: 'pl_label_venus',
  },
  earth: {
    id: 'earth',
    topic: 'addition',
    rangeMax: 12,
    rangeKey: 'pl_range_add12',
    skillKey: 'pl_skill_earth',
    labelKey: 'pl_label_earth',
  },
  mars: {
    id: 'mars',
    topic: 'addition',
    rangeMax: 20,
    rangeKey: 'pl_range_add20',
    skillKey: 'pl_skill_mars',
    labelKey: 'pl_label_mars',
  },
  jupiter: {
    id: 'jupiter',
    topic: 'addition',
    rangeMax: 100,
    rangeKey: 'pl_range_to100',
    skillKey: 'pl_skill_jupiter',
    labelKey: 'pl_label_jupiter',
  },
  saturn: {
    id: 'saturn',
    topic: 'subtraction',
    rangeMax: 12,
    rangeKey: 'pl_range_sub12',
    skillKey: 'pl_skill_saturn',
    labelKey: 'pl_label_saturn',
  },
  uranus: {
    id: 'uranus',
    topic: 'subtraction',
    rangeMax: 20,
    rangeKey: 'pl_range_sub20',
    skillKey: 'pl_skill_uranus',
    labelKey: 'pl_label_uranus',
  },
  neptune: {
    id: 'neptune',
    topic: 'subtraction',
    rangeMax: 20,
    rangeKey: 'pl_range_sub20',
    skillKey: 'pl_skill_neptune',
    labelKey: 'pl_label_neptune',
  },
};

export const PLANET_LEVEL_LIST: PlanetLevelInfo[] = PLANET_ORDER.map(
  (id) => PLANET_LEVELS[id]
);

export const getPlanetLevel = (planetId: string | null | undefined): PlanetLevelInfo => {
  const key = (planetId ?? 'sun').toLowerCase() as PlanetId;
  return PLANET_LEVELS[key] ?? PLANET_LEVELS.sun;
};

/** Dropdown / list option text keys: planet name is separate; use labelKey. */
export const planetOptionKeys = (planetId: PlanetId) => {
  const info = PLANET_LEVELS[planetId];
  return {
    labelKey: info.labelKey,
    topic: info.topic,
    rangeKey: info.rangeKey,
    skillKey: info.skillKey,
    lesson: getLessonForPlanet(planetId),
  };
};
