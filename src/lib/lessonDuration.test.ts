import { describe, expect, it } from 'vitest';
import { PLANET_ORDER } from '@/lib/planets';
import { estimatedSeconds, planetActivities } from './lessonDuration';

describe('planet lesson length estimates', () => {
  it('puts every planet between 15 and 25 minutes', () => {
    for (const planet of PLANET_ORDER) {
      const seconds = estimatedSeconds(planet);
      const minutes = seconds / 60;
      expect(minutes, planet).toBeGreaterThanOrEqual(15);
      expect(minutes, planet).toBeLessThanOrEqual(25);
      expect(planetActivities(planet).filter((kind) => kind === 'drill' || kind === 'challenge').length).toBeGreaterThanOrEqual(8);
    }
  });
});
