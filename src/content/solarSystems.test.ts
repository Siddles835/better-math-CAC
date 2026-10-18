import { describe, expect, it } from 'vitest';
import { PLANET_ORDER } from '@/lib/planets';
import {
  BUILDER_TOPICS,
  LIVE_SOLAR_SYSTEMS,
  SOLAR_SYSTEMS,
  isTopicStartPlanet,
  legacyPathIdForSolar,
  resolveSolarSystem,
  resolveSolarSystemId,
  topicStartPlanets,
} from './solarSystems';

describe('solarSystems registry', () => {
  it('ships only SS1 live — one solar system for the class', () => {
    expect(LIVE_SOLAR_SYSTEMS.map((system) => system.id)).toEqual(['ss1']);
    expect(LIVE_SOLAR_SYSTEMS[0].topics).toEqual(['counting', 'addition', 'subtraction']);
    expect(LIVE_SOLAR_SYSTEMS[0].nodes).toHaveLength(9);
    expect(LIVE_SOLAR_SYSTEMS[0].nodes.map((node) => node.id)).toEqual([...PLANET_ORDER]);
  });

  it('maps every stored path id onto the single live system', () => {
    expect(resolveSolarSystemId('foundations')).toBe('ss1');
    expect(resolveSolarSystemId('operations')).toBe('ss1');
    expect(resolveSolarSystemId('addition')).toBe('ss1');
    expect(resolveSolarSystemId('multiplication')).toBe('ss1');
    expect(resolveSolarSystemId('ss2')).toBe('ss1');
    expect(legacyPathIdForSolar('ss1')).toBe('foundations');
    expect(legacyPathIdForSolar('ss2')).toBe('foundations');
    expect(resolveSolarSystem('geometry').id).toBe('ss1');
  });

  it('marks Sun, Earth, and Saturn as topic starting planets', () => {
    expect(topicStartPlanets()).toEqual(['sun', 'earth', 'saturn']);
    expect(isTopicStartPlanet('sun')).toBe(true);
    expect(isTopicStartPlanet('earth')).toBe(true);
    expect(isTopicStartPlanet('saturn')).toBe(true);
    expect(isTopicStartPlanet('mars')).toBe(false);
  });

  it('keeps builder topics on generators that already audit cleanly', () => {
    expect(BUILDER_TOPICS).toEqual([
      'counting',
      'addition',
      'subtraction',
      'multiplication',
      'division',
      'algebra',
    ]);
  });

  it('keeps extra systems coming soon and out of the live list', () => {
    const soon = SOLAR_SYSTEMS.filter((system) => system.comingSoon);
    expect(soon.map((system) => system.id)).toEqual([
      'ss2',
      'ss3',
      'ss4',
      'ss5',
      'ss6',
      'ss7',
      'ss8',
    ]);
    expect(LIVE_SOLAR_SYSTEMS.map((system) => system.id)).not.toContain('ss2');
  });
});
