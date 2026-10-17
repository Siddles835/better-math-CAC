import { describe, expect, it } from 'vitest';
import { BUILDER_TOPICS } from '@/content/solarSystems';
import { PLANET_ORDER } from '@/lib/planets';
import { buildThreeTopicCurriculum, assertThreeTopicValid } from './threeTopicBuild';
import type { TopicId } from '@/content/solarSystems';

/** All unordered triples from BUILDER_TOPICS, each with one canonical order (sorted). */
const unorderedTriples = (): Array<[TopicId, TopicId, TopicId]> => {
  const topics = BUILDER_TOPICS;
  const out: Array<[TopicId, TopicId, TopicId]> = [];
  for (let i = 0; i < topics.length; i += 1) {
    for (let j = i + 1; j < topics.length; j += 1) {
      for (let k = j + 1; k < topics.length; k += 1) {
        out.push([topics[i], topics[j], topics[k]]);
      }
    }
  }
  return out;
};

const assertValidBuild = (topics: [TopicId, TopicId, TopicId]) => {
  const curriculum = buildThreeTopicCurriculum({
    classCode: 'demo',
    topics,
    grade: '1',
    pace: 'standard',
  });
  expect(assertThreeTopicValid(curriculum)).toEqual([]);
  expect(curriculum.nodes).toHaveLength(9);
  expect(curriculum.nodes.map((node) => node.id)).toEqual([...PLANET_ORDER]);
  expect(curriculum.nodes.map((node) => node.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let index = 0; index < curriculum.nodes.length; index += 1) {
    const node = curriculum.nodes[index];
    if (index === 0) {
      expect(node.prerequisites).toEqual([]);
    } else {
      expect(node.prerequisites).toEqual([PLANET_ORDER[index - 1]]);
    }
    const band = Math.floor(index / 3);
    expect(node.topics[0]).toBe(topics[band]);
    expect(node.source.problems.length).toBeGreaterThanOrEqual(3);
    expect(node.source.problems.length).toBeLessThanOrEqual(8);
  }
  expect(curriculum.generatedFrom?.topics).toEqual(topics);
};

describe('buildThreeTopicCurriculum', () => {
  it('builds valid curricula for every unordered builder triple (one order each)', () => {
    const triples = unorderedTriples();
    // C(6,3) = 20
    expect(triples).toHaveLength(20);
    for (const topics of triples) {
      assertValidBuild(topics);
    }
  });

  it('builds valid curricula for additional topic orders', () => {
    const orders: Array<[TopicId, TopicId, TopicId]> = [
      ['subtraction', 'counting', 'addition'],
      ['algebra', 'multiplication', 'division'],
      ['division', 'addition', 'counting'],
      ['multiplication', 'counting', 'subtraction'],
      ['addition', 'algebra', 'multiplication'],
      ['counting', 'division', 'algebra'],
    ];
    for (const topics of orders) {
      assertValidBuild(topics);
    }
  });

  it('exposes builder topics that match the live generator set', () => {
    expect(BUILDER_TOPICS).toEqual([
      'counting',
      'addition',
      'subtraction',
      'multiplication',
      'division',
      'algebra',
    ]);
  });
});
