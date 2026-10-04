import { beforeEach, describe, expect, it } from 'vitest';
import {
  SOLO_CLASS_CODE,
  clearSoloProgress,
  createSoloProgress,
  isSoloClassCode,
  loadSoloProgress,
  patchSoloProgressFields,
  saveSoloProgress,
  soloProgressToStudent,
} from './solo';
import { arrayUnionValue } from './studentWrites';

describe('solo helpers', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => store.clear(),
      },
    });
    clearSoloProgress();
  });

  it('recognizes the reserved solo class code', () => {
    expect(isSoloClassCode(SOLO_CLASS_CODE)).toBe(true);
    expect(isSoloClassCode('Solo')).toBe(true);
    expect(isSoloClassCode('room12')).toBe(false);
  });

  it('seeds progress from a placement unlock', () => {
    const progress = createSoloProgress('Comet Fox', 'mars', 'earth');
    expect(progress.nickname).toBe('comet fox');
    expect(progress.displayName).toBe('Comet Fox');
    expect(progress.planet).toBe('earth');
    expect(progress.unlockPlanet).toBe('mars');
    expect(progress.completedPlanets).toContain('sun');
    expect(progress.completedPlanets).toContain('venus');
    expect(progress.completedPlanets).not.toContain('earth');
  });

  it('round-trips local progress and patches fields', () => {
    const seeded = createSoloProgress('Nova Bee', 'venus', 'mercury');
    saveSoloProgress(seeded);
    expect(loadSoloProgress('Nova Bee')?.planet).toBe('mercury');

    const patched = patchSoloProgressFields({
      planet: 'venus',
      completedPlanets: arrayUnionValue('mercury'),
      planetSteps: { venus: 2 },
    });
    expect(patched?.planet).toBe('venus');
    expect(patched?.completedPlanets).toContain('mercury');
    expect(patched?.planetSteps.venus).toBe(2);

    const student = soloProgressToStudent(patched!);
    expect(student.nickname).toBe('Nova Bee');
    expect(student.planet).toBe('venus');
  });
});
