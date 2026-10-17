import { BUILDER_TOPICS, type TopicId, generatorForTopic } from '@/content/solarSystems';
import type { Curriculum, CurriculumNode, Problem } from '@/content/types';
import { PLANET_ORDER } from '@/lib/planets';
import { problemsForNode } from '@/lib/paths/generators';
import { hydrateCurriculum } from '@/lib/curriculum/hydrate';
import { validateCurriculum } from '@/lib/curriculum/logic';
import { stripUndefined } from '@/lib/data/stripUndefined';

export type GradeBand = 'K' | '1' | '2';
export type Pace = 'gentle' | 'standard' | 'challenge';

export interface ThreeTopicSpec {
  classCode: string;
  topics: [TopicId, TopicId, TopicId];
  grade?: GradeBand;
  pace?: Pace;
  name?: string;
  id?: string;
}

const tiersFor = (bandIndex: number, pace: Pace): Array<1 | 2 | 3> => {
  if (pace === 'gentle') {
    if (bandIndex === 0) return [1];
    if (bandIndex === 1) return [1];
    return [1, 2];
  }
  if (pace === 'challenge') {
    if (bandIndex === 0) return [1, 2];
    if (bandIndex === 1) return [2, 3];
    return [2, 3];
  }
  if (bandIndex === 0) return [1];
  if (bandIndex === 1) return [1, 2];
  return [2, 3];
};

const perTierFor = (pace: Pace): number => (pace === 'challenge' ? 3 : pace === 'gentle' ? 2 : 3);

const TOPIC_TITLE_EN: Record<TopicId, string> = {
  counting: 'Counting',
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
  algebra: 'Algebra',
  'place-value': 'Tens and ones',
  hundreds: 'Hundreds',
  'compare-order': 'Compare and order',
  length: 'Length',
  time: 'Time',
  money: 'Money',
  shapes: 'Shapes',
  perimeter: 'Perimeter',
  area: 'Area',
  'equal-shares': 'Equal shares',
  'halves-quarters': 'Halves and quarters',
  'fractions-group': 'Fractions of a group',
  sorting: 'Sorting',
  'picture-graphs': 'Picture graphs',
  'bar-graphs': 'Bar graphs',
  patterns: 'Patterns',
  'skip-counting': 'Skip counting',
  'number-rules': 'Number rules',
};

const BAND_LABEL = ['Introduction', 'Practice', 'Challenge'] as const;

const planetTitle = (planetId: string): string =>
  `${planetId[0].toUpperCase()}${planetId.slice(1)}`;

export const isBuilderTopic = (topic: string): topic is TopicId =>
  (BUILDER_TOPICS as string[]).includes(topic);

/** Build a draft 9-planet curriculum from three topics. */
export const buildThreeTopicCurriculum = (spec: ThreeTopicSpec): Curriculum => {
  const pace = spec.pace ?? 'standard';
  const grade = spec.grade ?? '1';
  const topics = spec.topics;
  if (topics.length !== 3 || new Set(topics).size !== 3) {
    throw new Error('Need three different topics');
  }
  for (const topic of topics) {
    if (!isBuilderTopic(topic)) throw new Error(`Unsupported topic: ${topic}`);
  }

  const nodes: CurriculumNode[] = PLANET_ORDER.map((planetId, index) => {
    const topic = topics[Math.floor(index / 3)];
    const bandIndex = index % 3;
    const generatorId = generatorForTopic(topic);
    const seed = planetId.length * 97 + index * 13 + topic.length * 3;
    const problems: Problem[] = problemsForNode(
      generatorId,
      tiersFor(bandIndex, pace),
      perTierFor(pace),
      seed,
      0
    ).slice(0, 8);

    return {
      id: planetId,
      order: index + 1,
      title: `${planetTitle(planetId)}: ${TOPIC_TITLE_EN[topic]} (${BAND_LABEL[bandIndex]})`,
      prerequisites: index === 0 ? [] : [PLANET_ORDER[index - 1]],
      topics: [topic],
      masteryThreshold: 80,
      extraPractice: 0,
      source: { kind: 'authored', problems },
    };
  });

  const curriculum: Curriculum = stripUndefined({
    id: spec.id ?? `build-${Date.now()}`,
    classCode: spec.classCode,
    name: spec.name ?? topics.join(', '),
    status: 'draft',
    nodes,
    updatedAt: Date.now(),
    generatedFrom: { topics, grade, pace },
  });

  return hydrateCurriculum(curriculum);
};

export const assertThreeTopicValid = (curriculum: Curriculum): string[] =>
  validateCurriculum(curriculum);
