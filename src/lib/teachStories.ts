import type { Operator } from '@/lib/answers/compute';
import { computeExpectedAnswer } from '@/lib/answers/compute';
import { MAX_NUMBER } from '@/lib/lessonDuration';
import type { PlanetId } from '@/lib/planets';

export type StoryItem = 'apples' | 'pencils' | 'stars' | 'blocks';

export type StoryActionKind = 'fill' | 'add' | 'remove' | 'select' | 'tens-ones';

export interface StoryNarration {
  key: string;
  values: Record<string, number>;
}

/** What the child must do after listening. */
export interface StoryAction {
  kind: StoryActionKind;
  promptKey: string;
  promptValues: Record<string, number>;
  /** Correct ending count / selected count / tens-ones total. */
  target: number;
  item: StoryItem;
  /** Starting objects already on the board (add / remove). */
  start?: number;
  /** Extra objects the child can add (fill / add). */
  supply?: number;
  /** Distractor objects mixed in for select. */
  distractors?: number;
  tens?: number;
  ones?: number;
}

export interface TeachStoryDef {
  planet: PlanetId;
  index: 0 | 1;
  titleKey: string;
  narrations: StoryNarration[];
  action: StoryAction;
  rememberKey: string;
  operator: Operator;
  operands: [number, number];
}

const story = (
  planet: PlanetId,
  index: 0 | 1,
  titleKey: string,
  narrations: StoryNarration[],
  action: StoryAction,
  operator: Operator,
  operands: [number, number]
): TeachStoryDef => ({
  planet,
  index,
  titleKey,
  narrations,
  action,
  rememberKey: `ui:teach_${planet}`,
  operator,
  operands,
});

/**
 * Two interactive teach stories per planet.
 * Numbers live here once and feed narration placeholders, the action target,
 * and the picture counts.
 */
export const TEACH_STORIES: TeachStoryDef[] = [
  // Sun — one-to-one counting
  story(
    'sun',
    0,
    'ui:story_sun_0_title',
    [
      { key: 'ui:story_sun_0_n1', values: { a: 3 } },
      { key: 'ui:story_sun_0_n2', values: { total: 3 } },
    ],
    {
      kind: 'fill',
      promptKey: 'ui:story_sun_0_prompt',
      promptValues: { total: 3 },
      target: 3,
      item: 'apples',
      supply: 6,
    },
    'count',
    [3, 0]
  ),
  story(
    'sun',
    1,
    'ui:story_sun_1_title',
    [
      { key: 'ui:story_sun_1_n1', values: { a: 4 } },
      { key: 'ui:story_sun_1_n2', values: { total: 4 } },
    ],
    {
      kind: 'select',
      promptKey: 'ui:story_sun_1_prompt',
      promptValues: { total: 4 },
      target: 4,
      item: 'stars',
      supply: 4,
      distractors: 0,
    },
    'count',
    [4, 0]
  ),

  // Mercury — story tells how many, stop there
  story(
    'mercury',
    0,
    'ui:story_mercury_0_title',
    [
      { key: 'ui:story_mercury_0_n1', values: { a: 5 } },
      { key: 'ui:story_mercury_0_n2', values: { total: 5 } },
    ],
    {
      kind: 'fill',
      promptKey: 'ui:story_mercury_0_prompt',
      promptValues: { total: 5 },
      target: 5,
      item: 'apples',
      supply: 8,
    },
    'count',
    [5, 0]
  ),
  story(
    'mercury',
    1,
    'ui:story_mercury_1_title',
    [
      { key: 'ui:story_mercury_1_n1', values: { a: 4 } },
      { key: 'ui:story_mercury_1_n2', values: { a: 4, total: 4 } },
    ],
    {
      kind: 'fill',
      promptKey: 'ui:story_mercury_1_prompt',
      promptValues: { total: 4 },
      target: 4,
      item: 'apples',
      supply: 7,
    },
    'count',
    [4, 0]
  ),

  // Venus — count only what the story asks for
  story(
    'venus',
    0,
    'ui:story_venus_0_title',
    [
      { key: 'ui:story_venus_0_n1', values: { a: 3, b: 4 } },
      { key: 'ui:story_venus_0_n2', values: { a: 3, total: 3 } },
    ],
    {
      kind: 'select',
      promptKey: 'ui:story_venus_0_prompt',
      promptValues: { a: 3, total: 3 },
      target: 3,
      item: 'stars',
      supply: 3,
      distractors: 4,
    },
    'count',
    [3, 0]
  ),
  story(
    'venus',
    1,
    'ui:story_venus_1_title',
    [
      { key: 'ui:story_venus_1_n1', values: { a: 5, b: 2 } },
      { key: 'ui:story_venus_1_n2', values: { b: 2, total: 2 } },
    ],
    {
      kind: 'select',
      promptKey: 'ui:story_venus_1_prompt',
      promptValues: { b: 2, total: 2 },
      target: 2,
      item: 'blocks',
      supply: 2,
      distractors: 5,
    },
    'count',
    [2, 0]
  ),

  // Earth — count on
  story(
    'earth',
    0,
    'ui:story_earth_0_title',
    [
      { key: 'ui:story_earth_0_n1', values: { a: 3 } },
      { key: 'ui:story_earth_0_n2', values: { a: 3, b: 2, total: 5 } },
    ],
    {
      kind: 'add',
      promptKey: 'ui:story_earth_0_prompt',
      promptValues: { a: 3, b: 2, total: 5 },
      target: 5,
      item: 'pencils',
      start: 3,
      supply: 4,
    },
    '+',
    [3, 2]
  ),
  story(
    'earth',
    1,
    'ui:story_earth_1_title',
    [
      { key: 'ui:story_earth_1_n1', values: { a: 4 } },
      { key: 'ui:story_earth_1_n2', values: { a: 4, b: 3, total: 7 } },
    ],
    {
      kind: 'add',
      promptKey: 'ui:story_earth_1_prompt',
      promptValues: { a: 4, b: 3, total: 7 },
      target: 7,
      item: 'pencils',
      start: 4,
      supply: 5,
    },
    '+',
    [4, 3]
  ),

  // Mars — same total, two orders (child builds the total)
  story(
    'mars',
    0,
    'ui:story_mars_0_title',
    [
      { key: 'ui:story_mars_0_n1', values: { a: 2, b: 5, total: 7 } },
      { key: 'ui:story_mars_0_n2', values: { total: 7 } },
    ],
    {
      kind: 'add',
      promptKey: 'ui:story_mars_0_prompt',
      promptValues: { a: 2, b: 5, total: 7 },
      target: 7,
      item: 'pencils',
      start: 2,
      supply: 6,
    },
    '+',
    [2, 5]
  ),
  story(
    'mars',
    1,
    'ui:story_mars_1_title',
    [
      { key: 'ui:story_mars_1_n1', values: { a: 3, b: 4, total: 7 } },
      { key: 'ui:story_mars_1_n2', values: { total: 7 } },
    ],
    {
      kind: 'add',
      promptKey: 'ui:story_mars_1_prompt',
      promptValues: { a: 4, b: 3, total: 7 },
      target: 7,
      item: 'blocks',
      start: 4,
      supply: 5,
    },
    '+',
    [3, 4]
  ),

  // Jupiter — tens and ones
  story(
    'jupiter',
    0,
    'ui:story_jupiter_0_title',
    [
      { key: 'ui:story_jupiter_0_n1', values: { a: 1, b: 4 } },
      { key: 'ui:story_jupiter_0_n2', values: { total: 14 } },
    ],
    {
      kind: 'tens-ones',
      promptKey: 'ui:story_jupiter_0_prompt',
      promptValues: { a: 1, b: 4, total: 14 },
      target: 14,
      item: 'blocks',
      tens: 1,
      ones: 4,
    },
    '+',
    [10, 4]
  ),
  story(
    'jupiter',
    1,
    'ui:story_jupiter_1_title',
    [
      { key: 'ui:story_jupiter_1_n1', values: { a: 2, b: 3 } },
      { key: 'ui:story_jupiter_1_n2', values: { total: 23 } },
    ],
    {
      kind: 'tens-ones',
      promptKey: 'ui:story_jupiter_1_prompt',
      promptValues: { a: 2, b: 3, total: 23 },
      target: 23,
      item: 'blocks',
      tens: 2,
      ones: 3,
    },
    '+',
    [20, 3]
  ),

  // Saturn — take away from whole group
  story(
    'saturn',
    0,
    'ui:story_saturn_0_title',
    [
      { key: 'ui:story_saturn_0_n1', values: { a: 6 } },
      { key: 'ui:story_saturn_0_n2', values: { a: 6, b: 2, total: 4 } },
    ],
    {
      kind: 'remove',
      promptKey: 'ui:story_saturn_0_prompt',
      promptValues: { a: 6, b: 2, total: 4 },
      target: 4,
      item: 'pencils',
      start: 6,
    },
    '−',
    [6, 2]
  ),
  story(
    'saturn',
    1,
    'ui:story_saturn_1_title',
    [
      { key: 'ui:story_saturn_1_n1', values: { a: 8 } },
      { key: 'ui:story_saturn_1_n2', values: { a: 8, b: 3, total: 5 } },
    ],
    {
      kind: 'remove',
      promptKey: 'ui:story_saturn_1_prompt',
      promptValues: { a: 8, b: 3, total: 5 },
      target: 5,
      item: 'apples',
      start: 8,
    },
    '−',
    [8, 3]
  ),

  // Uranus
  story(
    'uranus',
    0,
    'ui:story_uranus_0_title',
    [
      { key: 'ui:story_uranus_0_n1', values: { a: 9 } },
      { key: 'ui:story_uranus_0_n2', values: { b: 4, total: 5 } },
    ],
    {
      kind: 'remove',
      promptKey: 'ui:story_uranus_0_prompt',
      promptValues: { a: 9, b: 4, total: 5 },
      target: 5,
      item: 'pencils',
      start: 9,
    },
    '−',
    [9, 4]
  ),
  story(
    'uranus',
    1,
    'ui:story_uranus_1_title',
    [
      { key: 'ui:story_uranus_1_n1', values: { a: 7 } },
      { key: 'ui:story_uranus_1_n2', values: { b: 2, total: 5 } },
    ],
    {
      kind: 'remove',
      promptKey: 'ui:story_uranus_1_prompt',
      promptValues: { a: 7, b: 2, total: 5 },
      target: 5,
      item: 'blocks',
      start: 7,
    },
    '−',
    [7, 2]
  ),

  // Neptune
  story(
    'neptune',
    0,
    'ui:story_neptune_0_title',
    [
      { key: 'ui:story_neptune_0_n1', values: { a: 10 } },
      { key: 'ui:story_neptune_0_n2', values: { b: 3, total: 7 } },
    ],
    {
      kind: 'remove',
      promptKey: 'ui:story_neptune_0_prompt',
      promptValues: { a: 10, b: 3, total: 7 },
      target: 7,
      item: 'stars',
      start: 10,
    },
    '−',
    [10, 3]
  ),
  story(
    'neptune',
    1,
    'ui:story_neptune_1_title',
    [
      { key: 'ui:story_neptune_1_n1', values: { a: 8 } },
      { key: 'ui:story_neptune_1_n2', values: { b: 5, total: 3 } },
    ],
    {
      kind: 'remove',
      promptKey: 'ui:story_neptune_1_prompt',
      promptValues: { a: 8, b: 5, total: 3 },
      target: 3,
      item: 'apples',
      start: 8,
    },
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
    def.action.target,
    def.action.start ?? 0,
    def.action.supply ?? 0,
    def.action.distractors ?? 0,
    def.action.tens ?? 0,
    def.action.ones ?? 0,
    ...def.narrations.flatMap((line) => Object.values(line.values)),
    ...Object.values(def.action.promptValues),
  ];
  return values.every((n) => n >= 0 && n <= max);
};
