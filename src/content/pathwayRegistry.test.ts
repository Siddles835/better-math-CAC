import { describe, expect, it } from 'vitest';
import { PATHS } from '@/content/catalog';
import { getClassroomPathwayId, getLessonForPlanet, PLANET_ORDER } from '@/lib/planets';
import { normalizePathId } from '@/lib/paths/activeLearner';
import {
  foundationsInventory,
  isStudentFacingPathway,
  pathwayInventory,
  studentFacingPathIds,
} from './pathwayRegistry';

describe('pathway registry', () => {
  it('offers only foundations to students', () => {
    expect(studentFacingPathIds()).toEqual(['foundations']);
    expect(PATHS.map((path) => path.id)).toEqual(['foundations']);
    expect(isStudentFacingPathway('foundations')).toBe(true);
    expect(isStudentFacingPathway('addition')).toBe(false);
    expect(isStudentFacingPathway('operations')).toBe(false);
  });

  it('maps foundations planets to distinct count/add/sub lessons', () => {
    const entry = foundationsInventory();
    expect(entry.lessons).toHaveLength(9);
    expect(entry.lessons.map((item) => item.topic)).toEqual([
      'counting',
      'counting',
      'counting',
      'addition',
      'addition',
      'addition',
      'subtraction',
      'subtraction',
      'subtraction',
    ]);
    for (const planet of PLANET_ORDER) {
      expect(getLessonForPlanet(planet)).toBe(
        entry.lessons.find((item) => item.planet === planet)?.topic
      );
    }
  });

  it('normalizes legacy path ids to foundations without inventing new curricula', () => {
    expect(normalizePathId('operations')).toBe('foundations');
    expect(normalizePathId('addition')).toBe('foundations');
    expect(normalizePathId('all')).toBe('foundations');
    expect(getClassroomPathwayId({ defaultStart: { pathId: 'operations' } })).toBe('foundations');
  });

  it('keeps topic paths inventoried but not student-facing', () => {
    const topics = pathwayInventory().filter((entry) => !entry.studentFacing);
    expect(topics.length).toBeGreaterThan(0);
    expect(topics.every((entry) => entry.lessons.length === 0)).toBe(true);
  });
});
