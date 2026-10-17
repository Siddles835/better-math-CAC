import { describe, expect, it } from 'vitest';
import { PLANET_ORDER } from '@/lib/planets';
import {
  BUILDER_TOPICS,
  LIVE_SOLAR_SYSTEMS,
  SOLAR_SYSTEMS,
  generatorForTopic,
  isTopicStartPlanet,
  legacyPathIdForSolar,
  resolveSolarSystem,
  resolveSolarSystemId,
  topicStartPlanets,
} from './solarSystems';

describe('solarSystems registry', () => {
  it('ships SS1 and SS2 live with nine planets and three topics', () => {
    expect(LIVE_SOLAR_SYSTEMS.map((system) => system.id)).toEqual(['ss1', 'ss2']);
    for (const system of LIVE_SOLAR_SYSTEMS) {
      expect(system.nodes).toHaveLength(9);
      expect(system.topics).toHaveLength(3);
      expect(system.comingSoon).toBeFalsy();
      expect(system.nodes.map((node) => node.id)).toEqual([...PLANET_ORDER]);
    }
  });

  it('maps legacy path ids onto solar systems without breaking old data', () => {
    expect(resolveSolarSystemId('foundations')).toBe('ss1');
    expect(resolveSolarSystemId('operations')).toBe('ss2');
    expect(resolveSolarSystemId('addition')).toBe('ss1');
    expect(resolveSolarSystemId('multiplication')).toBe('ss2');
    expect(resolveSolarSystemId('ss1')).toBe('ss1');
    expect(resolveSolarSystemId('ss2')).toBe('ss2');
    expect(resolveSolarSystemId('ss3')).toBe('ss1'); // coming soon falls back
    expect(legacyPathIdForSolar('ss1')).toBe('foundations');
    expect(legacyPathIdForSolar('ss2')).toBe('operations');
    expect(resolveSolarSystem('geometry').id).toBe('ss2');
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

  it('designs six extra systems as coming soon until audits pass', () => {
    const soon = SOLAR_SYSTEMS.filter((system) => system.comingSoon);
    expect(soon.map((system) => system.id)).toEqual([
      'ss3',
      'ss4',
      'ss5',
      'ss6',
      'ss7',
      'ss8',
    ]);
    for (const system of soon) {
      expect(system.nodes).toHaveLength(9);
      expect(system.topics).toHaveLength(3);
    }
  });

  it('keeps SS5 coming soon until shapes/perimeter/area are distinct generators', () => {
    const ss5 = SOLAR_SYSTEMS.find((system) => system.id === 'ss5');
    expect(ss5).toBeTruthy();
    expect(ss5!.comingSoon).toBe(true);
    expect(ss5!.topics).toEqual(['shapes', 'perimeter', 'area']);
    expect(LIVE_SOLAR_SYSTEMS.map((system) => system.id)).not.toContain('ss5');
    expect(resolveSolarSystemId('ss5')).toBe('ss1');
    expect(legacyPathIdForSolar('ss5')).toBe('foundations');
    // Scaffolding still points at geometry; that single generator cannot
    // distinguish the three SS5 topics (see docs/SOLAR_SYSTEMS.md).
    expect(generatorForTopic('shapes')).toBe('geometry');
    expect(generatorForTopic('perimeter')).toBe('geometry');
    expect(generatorForTopic('area')).toBe('geometry');
    expect(ss5!.nodes).toHaveLength(9);
    expect(ss5!.nodes.map((node) => node.topics[0])).toEqual([
      'shapes',
      'shapes',
      'shapes',
      'perimeter',
      'perimeter',
      'perimeter',
      'area',
      'area',
      'area',
    ]);
  });
});
