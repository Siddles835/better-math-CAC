import type { Operator } from '@/lib/answers/compute';
import { computeExpectedAnswer } from '@/lib/answers/compute';
import { MAX_NUMBER } from '@/lib/lessonDuration';
import type { PlanetId } from '@/lib/planets';

export type StoryVisualKind = 'apples' | 'pencils' | 'stars' | 'blocks' | 'ten-frame' | 'tens-ones';

export interface StoryVisual {
  kind: StoryVisualKind;
  /** Objects to show. For tens-ones, use tens and ones instead. */
  count?: number;
  add?: number;
  crossed?: number;
  tens?: number;
  ones?: number;
}

export interface StoryLine {
  key: string;
  values: Record<string, number>;
  visual: StoryVisual;
}

export interface TeachStoryDef {
  planet: PlanetId;
  index: 0 | 1;
  titleKey: string;
  lines: StoryLine[];
  rememberKey: string;
  operator: Operator;
  operands: [number, number];
}

const story = (
  planet: PlanetId,
  index: 0 | 1,
  titleKey: string,
  lines: StoryLine[],
  operator: Operator,
  operands: [number, number]
): TeachStoryDef => ({
  planet,
  index,
  titleKey,
  lines,
  rememberKey: `ui:teach_${planet}`,
  operator,
  operands,
});

/**
 * Two teach stories per planet. Numbers live here once and feed both
 * translation placeholders and the picture counts.
 */
export const TEACH_STORIES: TeachStoryDef[] = [
  // Sun — one-to-one counting
  story(
    'sun',
    0,
    'ui:story_sun_0_title',
    [
      { key: 'ui:story_sun_0_l1', values: { a: 1 }, visual: { kind: 'apples', count: 1 } },
      { key: 'ui:story_sun_0_l2', values: { a: 2 }, visual: { kind: 'apples', count: 2 } },
      { key: 'ui:story_sun_0_l3', values: { a: 3, total: 3 }, visual: { kind: 'apples', count: 3 } },
    ],
    'count',
    [3, 0]
  ),
  story(
    'sun',
    1,
    'ui:story_sun_1_title',
    [
      { key: 'ui:story_sun_1_l1', values: { a: 4 }, visual: { kind: 'stars', count: 4 } },
      { key: 'ui:story_sun_1_l2', values: { a: 4 }, visual: { kind: 'stars', count: 4 } },
      { key: 'ui:story_sun_1_l3', values: { total: 4 }, visual: { kind: 'stars', count: 4 } },
    ],
    'count',
    [4, 0]
  ),

  // Mercury — story tells how many, stop there
  story(
    'mercury',
    0,
    'ui:story_mercury_0_title',
    [
      { key: 'ui:story_mercury_0_l1', values: { a: 5 }, visual: { kind: 'apples', count: 5 } },
      { key: 'ui:story_mercury_0_l2', values: { a: 5 }, visual: { kind: 'apples', count: 5 } },
      { key: 'ui:story_mercury_0_l3', values: { total: 5 }, visual: { kind: 'apples', count: 5 } },
    ],
    'count',
    [5, 0]
  ),
  story(
    'mercury',
    1,
    'ui:story_mercury_1_title',
    [
      { key: 'ui:story_mercury_1_l1', values: { a: 4 }, visual: { kind: 'apples', count: 4 } },
      { key: 'ui:story_mercury_1_l2', values: { a: 6 }, visual: { kind: 'apples', count: 6 } },
      { key: 'ui:story_mercury_1_l3', values: { a: 4, total: 4 }, visual: { kind: 'apples', count: 4 } },
    ],
    'count',
    [4, 0]
  ),

  // Venus — count only what the story asks for
  story(
    'venus',
    0,
    'ui:story_venus_0_title',
    [
      { key: 'ui:story_venus_0_l1', values: { a: 3, b: 4 }, visual: { kind: 'stars', count: 7 } },
      { key: 'ui:story_venus_0_l2', values: { a: 3 }, visual: { kind: 'stars', count: 3 } },
      { key: 'ui:story_venus_0_l3', values: { total: 3 }, visual: { kind: 'stars', count: 3 } },
    ],
    'count',
    [3, 0]
  ),
  story(
    'venus',
    1,
    'ui:story_venus_1_title',
    [
      { key: 'ui:story_venus_1_l1', values: { a: 5, b: 2 }, visual: { kind: 'blocks', count: 7 } },
      { key: 'ui:story_venus_1_l2', values: { b: 2 }, visual: { kind: 'blocks', count: 2 } },
      { key: 'ui:story_venus_1_l3', values: { total: 2 }, visual: { kind: 'blocks', count: 2 } },
    ],
    'count',
    [2, 0]
  ),

  // Earth — count on
  story(
    'earth',
    0,
    'ui:story_earth_0_title',
    [
      { key: 'ui:story_earth_0_l1', values: { a: 3 }, visual: { kind: 'pencils', count: 3 } },
      { key: 'ui:story_earth_0_l2', values: { a: 3, b: 2 }, visual: { kind: 'pencils', count: 3, add: 2 } },
      { key: 'ui:story_earth_0_l3', values: { a: 3, b: 2, total: 5 }, visual: { kind: 'pencils', count: 5 } },
    ],
    '+',
    [3, 2]
  ),
  story(
    'earth',
    1,
    'ui:story_earth_1_title',
    [
      { key: 'ui:story_earth_1_l1', values: { a: 4 }, visual: { kind: 'pencils', count: 4 } },
      { key: 'ui:story_earth_1_l2', values: { a: 4, b: 3 }, visual: { kind: 'pencils', count: 4, add: 3 } },
      { key: 'ui:story_earth_1_l3', values: { total: 7 }, visual: { kind: 'pencils', count: 7 } },
    ],
    '+',
    [4, 3]
  ),

  // Mars — same total, two orders
  story(
    'mars',
    0,
    'ui:story_mars_0_title',
    [
      { key: 'ui:story_mars_0_l1', values: { a: 2, b: 5, total: 7 }, visual: { kind: 'pencils', count: 2, add: 5 } },
      { key: 'ui:story_mars_0_l2', values: { a: 5, b: 2, total: 7 }, visual: { kind: 'pencils', count: 5, add: 2 } },
      { key: 'ui:story_mars_0_l3', values: { total: 7 }, visual: { kind: 'pencils', count: 7 } },
    ],
    '+',
    [2, 5]
  ),
  story(
    'mars',
    1,
    'ui:story_mars_1_title',
    [
      { key: 'ui:story_mars_1_l1', values: { a: 3, b: 4, total: 7 }, visual: { kind: 'blocks', count: 3, add: 4 } },
      { key: 'ui:story_mars_1_l2', values: { a: 4, b: 3, total: 7 }, visual: { kind: 'blocks', count: 4, add: 3 } },
      { key: 'ui:story_mars_1_l3', values: { total: 7 }, visual: { kind: 'blocks', count: 7 } },
    ],
    '+',
    [3, 4]
  ),

  // Jupiter — tens and ones
  story(
    'jupiter',
    0,
    'ui:story_jupiter_0_title',
    [
      { key: 'ui:story_jupiter_0_l1', values: { a: 1, b: 4 }, visual: { kind: 'tens-ones', tens: 1, ones: 4 } },
      { key: 'ui:story_jupiter_0_l2', values: { a: 10, b: 4, total: 14 }, visual: { kind: 'tens-ones', tens: 1, ones: 4 } },
      { key: 'ui:story_jupiter_0_l3', values: { total: 14 }, visual: { kind: 'tens-ones', tens: 1, ones: 4 } },
    ],
    '+',
    [10, 4]
  ),
  story(
    'jupiter',
    1,
    'ui:story_jupiter_1_title',
    [
      { key: 'ui:story_jupiter_1_l1', values: { a: 2, b: 3 }, visual: { kind: 'tens-ones', tens: 2, ones: 3 } },
      { key: 'ui:story_jupiter_1_l2', values: { a: 20, b: 3, total: 23 }, visual: { kind: 'tens-ones', tens: 2, ones: 3 } },
      { key: 'ui:story_jupiter_1_l3', values: { total: 23 }, visual: { kind: 'tens-ones', tens: 2, ones: 3 } },
    ],
    '+',
    [20, 3]
  ),

  // Saturn — take away from whole group
  story(
    'saturn',
    0,
    'ui:story_saturn_0_title',
    [
      { key: 'ui:story_saturn_0_l1', values: { a: 6 }, visual: { kind: 'pencils', count: 6 } },
      { key: 'ui:story_saturn_0_l2', values: { a: 6, b: 2 }, visual: { kind: 'pencils', count: 6, crossed: 2 } },
      { key: 'ui:story_saturn_0_l3', values: { a: 6, b: 2, total: 4 }, visual: { kind: 'pencils', count: 4 } },
    ],
    '−',
    [6, 2]
  ),
  story(
    'saturn',
    1,
    'ui:story_saturn_1_title',
    [
      { key: 'ui:story_saturn_1_l1', values: { a: 8 }, visual: { kind: 'apples', count: 8 } },
      { key: 'ui:story_saturn_1_l2', values: { a: 8, b: 3 }, visual: { kind: 'apples', count: 8, crossed: 3 } },
      { key: 'ui:story_saturn_1_l3', values: { b: 3, total: 5 }, visual: { kind: 'apples', count: 5 } },
    ],
    '−',
    [8, 3]
  ),

  // Uranus — take away the number the story says
  story(
    'uranus',
    0,
    'ui:story_uranus_0_title',
    [
      { key: 'ui:story_uranus_0_l1', values: { a: 9 }, visual: { kind: 'pencils', count: 9 } },
      { key: 'ui:story_uranus_0_l2', values: { a: 9, b: 4 }, visual: { kind: 'pencils', count: 9, crossed: 4 } },
      { key: 'ui:story_uranus_0_l3', values: { b: 4, total: 5 }, visual: { kind: 'pencils', count: 5 } },
    ],
    '−',
    [9, 4]
  ),
  story(
    'uranus',
    1,
    'ui:story_uranus_1_title',
    [
      { key: 'ui:story_uranus_1_l1', values: { a: 7 }, visual: { kind: 'blocks', count: 7 } },
      { key: 'ui:story_uranus_1_l2', values: { a: 7, b: 2 }, visual: { kind: 'blocks', count: 7, crossed: 2 } },
      { key: 'ui:story_uranus_1_l3', values: { b: 2, total: 5 }, visual: { kind: 'blocks', count: 5 } },
    ],
    '−',
    [7, 2]
  ),

  // Neptune — take away the story number
  story(
    'neptune',
    0,
    'ui:story_neptune_0_title',
    [
      { key: 'ui:story_neptune_0_l1', values: { a: 10 }, visual: { kind: 'stars', count: 10 } },
      { key: 'ui:story_neptune_0_l2', values: { a: 10, b: 3 }, visual: { kind: 'stars', count: 10, crossed: 3 } },
      { key: 'ui:story_neptune_0_l3', values: { b: 3, total: 7 }, visual: { kind: 'stars', count: 7 } },
    ],
    '−',
    [10, 3]
  ),
  story(
    'neptune',
    1,
    'ui:story_neptune_1_title',
    [
      { key: 'ui:story_neptune_1_l1', values: { a: 8 }, visual: { kind: 'apples', count: 8 } },
      { key: 'ui:story_neptune_1_l2', values: { a: 8, b: 5 }, visual: { kind: 'apples', count: 8, crossed: 5 } },
      { key: 'ui:story_neptune_1_l3', values: { b: 5, total: 3 }, visual: { kind: 'apples', count: 3 } },
    ],
    '−',
    [8, 5]
  ),
];

export const getTeachStory = (planet: PlanetId, index: 0 | 1): TeachStoryDef => {
  const found = TEACH_STORIES.find((entry) => entry.planet === planet && entry.index === index);
  if (!found) throw new Error(`Missing teach story for ${planet} ${index}`);
  return found;
};

export const storyExpected = (def: TeachStoryDef): number =>
  computeExpectedAnswer(def.operator, def.operands[0], def.operands[1]);

export const storyNumbersInRange = (def: TeachStoryDef): boolean => {
  const max = MAX_NUMBER[def.planet];
  const values = [
    ...def.operands,
    ...def.lines.flatMap((line) => Object.values(line.values)),
    ...(def.lines.flatMap((line) => {
      const visual = line.visual;
      return [visual.count, visual.add, visual.crossed, visual.tens, visual.ones].filter(
        (n): n is number => typeof n === 'number'
      );
    })),
  ];
  return values.every((n) => n >= 0 && n <= max);
};
