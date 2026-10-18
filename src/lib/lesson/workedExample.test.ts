import { describe, expect, it } from 'vitest';
import { PLANET_ORDER } from '@/lib/planets';
import { getWorkedExample, topicLabelKey } from './workedExample';

describe('workedExample', () => {
  it('gives every planet a topic-matched worked example', () => {
    for (const planet of PLANET_ORDER) {
      const example = getWorkedExample(planet);
      expect(example.planet).toBe(planet);
      expect(example.a).toBeGreaterThan(0);
      if (example.topic === 'counting') {
        expect(example.op).toBe('count');
      } else if (example.topic === 'addition') {
        expect(example.op).toBe('add');
        expect(example.b).toBeGreaterThan(0);
      } else {
        expect(example.op).toBe('subtract');
        expect(example.b).toBeGreaterThan(0);
        expect(example.a).toBeGreaterThanOrEqual(example.b);
      }
    }
  });

  it('maps topics to locale keys', () => {
    expect(topicLabelKey('counting')).toBe('topic_counting');
    expect(topicLabelKey('addition')).toBe('topic_addition');
    expect(topicLabelKey('subtraction')).toBe('topic_subtraction');
  });
});
