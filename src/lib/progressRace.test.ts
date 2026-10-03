import { describe, expect, it } from 'vitest';
import {
  canSelectPlanet,
  getInProgressPlanet,
  getNextPlanet,
  PLANET_ORDER,
} from '@/lib/planets';
import {
  createStudentWriter,
  isArrayUnion,
  mergeProgressView,
  type ProgressView,
} from '@/lib/studentWrites';

type ServerStudent = {
  planet: string;
  lesson: string;
  lastPlanet: string;
  completedPlanets: string[];
  planetSteps: Record<string, number>;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const applyFields = (student: ServerStudent, fields: Record<string, unknown>) => {
  for (const [path, value] of Object.entries(fields)) {
    const parts = path.split('.');
    let cursor: Record<string, unknown> = student;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      const next = cursor[key];
      if (!next || typeof next !== 'object') cursor[key] = {};
      cursor = cursor[key] as Record<string, unknown>;
    }
    const leaf = parts[parts.length - 1];
    if (isArrayUnion(value)) {
      const prev = Array.isArray(cursor[leaf]) ? [...(cursor[leaf] as string[])] : [];
      for (const id of value.__arrayUnion) {
        if (!prev.includes(id)) prev.push(id);
      }
      cursor[leaf] = prev;
    } else {
      cursor[leaf] = value as never;
    }
  }
};

const freshServer = (): ServerStudent => ({
  planet: 'saturn',
  lesson: 'subtraction',
  lastPlanet: 'saturn',
  completedPlanets: ['jupiter'],
  planetSteps: { saturn: 15 },
});

const race = async (order: 'complete-first' | 'step-first', options?: { failTimes?: number }) => {
  const server = freshServer();
  let failures = options?.failTimes ?? 0;
  const writer = createStudentWriter({
    retries: 4,
    retryDelayMs: options?.failTimes ? 1 : 0,
    write: async (fields) => {
      await delay(20);
      if (failures > 0) {
        failures -= 1;
        throw new Error('network');
      }
      applyFields(server, fields);
    },
  });
  writer.seed(
    {
      planet: 'saturn',
      lastPlanet: 'saturn',
      completedPlanets: ['jupiter'],
      planetSteps: { saturn: 15 },
    },
    false
  );
  const stepSave = () => writer.savePlanetStep('saturn', 2);
  const complete = () => writer.completePlanet('saturn');
  if (order === 'complete-first') await Promise.all([complete(), stepSave()]);
  else await Promise.all([stepSave(), complete()]);
  return { server, view: writer.view() };
};

describe('planet completion race', () => {
  it('keeps Uranus unlocked when completion and a step save overlap', async () => {
    for (const order of ['complete-first', 'step-first'] as const) {
      const { server, view } = await race(order);
      expect(view.planet).toBe('uranus');
      expect(view.completedPlanets).toContain('saturn');
      expect(server.planet).toBe('uranus');
      expect(server.completedPlanets).toContain('saturn');
      expect(server.planetSteps.saturn).toBe(15);
    }
  });

  it('unlocks the next planet locally when the network keeps failing', async () => {
    const writer = createStudentWriter({
      retries: 2,
      retryDelayMs: 0,
      write: async () => {
        throw new Error('offline');
      },
    });
    const pending = writer.completePlanet('saturn');
    expect(writer.view().planet).toBe('uranus');
    expect(writer.view().completedPlanets).toContain('saturn');
    await pending;
    expect(writer.view().planet).toBe('uranus');
    expect(writer.view().completedPlanets).toContain('saturn');
  });

  it('retries a failed write and still stores the unlock', async () => {
    const { server, view } = await race('step-first', { failTimes: 2 });
    expect(view.planet).toBe('uranus');
    expect(server.planet).toBe('uranus');
    expect(server.completedPlanets).toContain('saturn');
  });

  it('unlocks each next planet from the Sun through Neptune', async () => {
    const writer = createStudentWriter({
      write: async () => {},
      retryDelayMs: 0,
    });
    for (const planet of PLANET_ORDER) {
      expect(
        canSelectPlanet(planet, {
          progressPlanetId: writer.view().planet,
          classMaxPlanetId: 'sun',
        })
      ).toBe(true);
      await writer.completePlanet(planet);
      const next = getNextPlanet(planet);
      if (next) {
        expect(
          canSelectPlanet(next, {
            progressPlanetId: writer.view().planet,
            classMaxPlanetId: 'sun',
          })
        ).toBe(true);
      }
    }
    expect(writer.view().planet).toBe('neptune');
    expect(writer.view().completedPlanets).toEqual([...PLANET_ORDER]);
    expect(
      canSelectPlanet('neptune', {
        progressPlanetId: writer.view().planet,
        classMaxPlanetId: 'sun',
      })
    ).toBe(true);
  });

  it('keeps a replay and continue-where-you-left-off from moving progress backward', async () => {
    const writer = createStudentWriter({ write: async () => {}, retryDelayMs: 0 });
    for (const planet of PLANET_ORDER) {
      if (planet === 'neptune') break;
      await writer.completePlanet(planet);
    }
    expect(writer.view().planet).toBe('neptune');
    await writer.markVisited('earth');
    expect(writer.view().planet).toBe('neptune');
    expect(writer.view().lastPlanet).toBe('earth');
    expect(
      canSelectPlanet('neptune', {
        progressPlanetId: writer.view().planet,
        classMaxPlanetId: 'sun',
      })
    ).toBe(true);
    expect(
      getInProgressPlanet(writer.view().planetSteps, writer.view().planet, writer.view().lastPlanet)
    ).toBe('earth');

    const stale = mergeProgressView(
      writer.view(),
      {
        planet: 'saturn',
        lastPlanet: 'saturn',
        completedPlanets: ['jupiter'],
        planetSteps: { saturn: 2 },
      },
      true
    );
    expect(stale.planet).toBe('neptune');
    expect(stale.completedPlanets).toContain('saturn');
    expect(stale.lastPlanet).toBe('earth');
    expect(stale.planetSteps.saturn).toBeGreaterThanOrEqual(2);

    const resumed = mergeProgressView(
      {
        planet: 'sun',
        lesson: 'counting',
        lastPlanet: 'sun',
        completedPlanets: [],
        planetSteps: {},
      } satisfies ProgressView,
      {
        planet: 'saturn',
        lastPlanet: 'saturn',
        completedPlanets: ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter'],
        planetSteps: { saturn: 4 },
      },
      false
    );
    expect(resumed.planet).toBe('saturn');
    expect(getInProgressPlanet(resumed.planetSteps, resumed.planet, resumed.lastPlanet)).toBe(
      'saturn'
    );
    expect(resumed.lastPlanet).toBe('saturn');
  });
});
