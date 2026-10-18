import type { LessonType } from '@/lib/classroom';
import type { GroupOp } from '@/components/animations/groupAnimationMath';
import { getPlanetLevel } from '@/lib/planetLevels';
import { PLANET_META, type PlanetId } from '@/lib/planets';

export interface WorkedExampleDef {
  planet: PlanetId;
  topic: LessonType;
  op: GroupOp;
  a: number;
  b: number;
  /** Built-in sticker id for the animation. */
  glyph: string;
}

/** One clear worked example per planet, matched to that lesson’s topic. */
const EXAMPLES: Record<PlanetId, Omit<WorkedExampleDef, 'planet' | 'topic'>> = {
  sun: { op: 'count', a: 5, b: 0, glyph: 'apple' },
  mercury: { op: 'count', a: 7, b: 0, glyph: 'star' },
  venus: { op: 'count', a: 8, b: 0, glyph: 'block' },
  earth: { op: 'add', a: 3, b: 2, glyph: 'apple' },
  mars: { op: 'add', a: 5, b: 4, glyph: 'star' },
  jupiter: { op: 'add', a: 6, b: 3, glyph: 'block' },
  saturn: { op: 'subtract', a: 7, b: 3, glyph: 'apple' },
  uranus: { op: 'subtract', a: 9, b: 4, glyph: 'star' },
  neptune: { op: 'subtract', a: 8, b: 5, glyph: 'block' },
};

export const getWorkedExample = (planet: PlanetId): WorkedExampleDef => {
  const level = getPlanetLevel(planet);
  const base = EXAMPLES[planet] ?? EXAMPLES.sun;
  return {
    planet,
    topic: level.topic,
    ...base,
  };
};

export const planetDisplayName = (planet: PlanetId): string =>
  PLANET_META[planet]?.name ?? planet;

export const topicLabelKey = (topic: LessonType): string => {
  if (topic === 'addition') return 'topic_addition';
  if (topic === 'subtraction') return 'topic_subtraction';
  return 'topic_counting';
};
