import { describe, expect, it } from 'vitest';
import { BUILDER_TOPICS } from '@/content/solarSystems';
import { PLANET_ORDER } from '@/lib/planets';
import { buildThreeTopicCurriculum, assertThreeTopicValid } from './threeTopicBuild';
import type { TopicId } from '@/content/solarSystems';

describe('buildThreeTopicCurriculum', () => {
  it('builds valid 9-planet curricula for representative topic triples', () => {
    const samples: Array<[TopicId, TopicId, TopicId]> = [
      ['counting', 'addition', 'subtraction'],
      ['multiplication', 'division', 'algebra'],
      ['counting', 'multiplication', 'algebra'],
      ['addition', 'division', 'subtraction'],
    ];
    for (const topics of samples) {
      const curriculum = buildThreeTopicCurriculum({
        classCode: 'demo',
        topics,
        grade: '1',
        pace: 'standard',
      });
      expect(curriculum.nodes).toHaveLength(9);
      expect(curriculum.nodes.map((node) => node.id)).toEqual([...PLANET_ORDER]);
      expect(curriculum.generatedFrom?.topics).toEqual(topics);
      expect(assertThreeTopicValid(curriculum)).toEqual([]);
      for (const node of curriculum.nodes) {
        expect(node.source.problems.length).toBeGreaterThanOrEqual(3);
        expect(node.source.problems.length).toBeLessThanOrEqual(8);
      }
      expect(curriculum.nodes[0].topics[0]).toBe(topics[0]);
      expect(curriculum.nodes[3].topics[0]).toBe(topics[1]);
      expect(curriculum.nodes[6].topics[0]).toBe(topics[2]);
    }
  });

  it('exposes builder topics that match the live generator set', () => {
    expect(BUILDER_TOPICS).toContain('counting');
    expect(BUILDER_TOPICS).toContain('algebra');
  });
});
