import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STAIRCASE,
  PLACEMENT_LEVELS,
  createStaircase,
  nextStaircaseState,
  planetForClearedLevel,
  resultFromStaircase,
  runStaircase,
  skippedPlacement,
  type PlacementOutcome,
} from './placement';

describe('nextStaircaseState', () => {
  it('ignores unreadable outcomes (never counts as wrong)', () => {
    let state = createStaircase({ minItems: 12, maxItems: 16 });
    state = nextStaircaseState(state, 'unreadable');
    expect(state.itemsAnswered).toBe(0);
    expect(state.missesAtLevel).toBe(0);
    expect(state.levelIndex).toBe(0);
    expect(state.done).toBe(false);
  });

  it('moves up after two successes at a level', () => {
    let state = createStaircase();
    state = nextStaircaseState(state, 'correct');
    expect(state.levelIndex).toBe(0);
    state = nextStaircaseState(state, 'correct');
    expect(state.levelIndex).toBe(1);
    expect(state.clearedLevelIndex).toBe(0);
    expect(state.successesAtLevel).toBe(0);
  });

  it('stops going harder after two misses at a level', () => {
    let state = createStaircase();
    // Clear level 0, move to 1
    state = nextStaircaseState(state, 'correct');
    state = nextStaircaseState(state, 'correct');
    expect(state.levelIndex).toBe(1);
    // Two misses at level 1
    state = nextStaircaseState(state, 'incorrect');
    state = nextStaircaseState(state, 'incorrect');
    expect(state.stopHarder).toBe(true);
    // Further successes do not raise the level
    state = nextStaircaseState(state, 'correct');
    state = nextStaircaseState(state, 'correct');
    expect(state.levelIndex).toBe(1);
  });
});

describe('runStaircase policies', () => {
  it('always-correct climbs to the top and recommends Uranus', () => {
    const { state, result } = runStaircase(['correct']);
    expect(state.clearedLevelIndex).toBe(PLACEMENT_LEVELS.length - 1);
    expect(state.itemsAnswered).toBeGreaterThanOrEqual(DEFAULT_STAIRCASE.minItems);
    expect(state.itemsAnswered).toBeLessThanOrEqual(DEFAULT_STAIRCASE.maxItems);
    expect(result.startPlanet).toBe('uranus');
    expect(result.labelKey).toBe('pl_label_uranus');
  });

  it('always-wrong stays at the Sun with thin progress', () => {
    const { state, result } = runStaircase(['incorrect']);
    expect(state.clearedLevelIndex).toBe(-1);
    expect(state.stopHarder).toBe(true);
    expect(state.itemsAnswered).toBe(DEFAULT_STAIRCASE.minItems);
    expect(result.startPlanet).toBe('sun');
  });

  it('mixed: clears counting then freezes on early addition', () => {
    // 2 correct × 3 counting bands = 6, then misses on add10
    const outcomes: PlacementOutcome[] = [
      'correct',
      'correct', // count10
      'correct',
      'correct', // count20
      'correct',
      'correct', // count100 → cleared index 2
      'incorrect',
      'incorrect', // freeze on add10
      'incorrect',
      'incorrect',
      'incorrect',
      'incorrect',
    ];
    const { state, result } = runStaircase(outcomes);
    expect(state.clearedLevelIndex).toBe(2);
    expect(state.stopHarder).toBe(true);
    expect(result.startPlanet).toBe('venus');
  });

  it('mixed: after freeze, two more successes still clear the frozen level', () => {
    const outcomes: PlacementOutcome[] = [
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
      'correct', // cleared count100
      'incorrect',
      'incorrect', // freeze on add10
      'correct',
      'correct', // clear add10 without moving up
      'incorrect',
      'incorrect',
    ];
    const { state, result } = runStaircase(outcomes);
    expect(state.clearedLevelIndex).toBe(PLACEMENT_LEVELS.indexOf('add10'));
    expect(state.stopHarder).toBe(true);
    expect(result.startPlanet).toBe('earth');
  });

  it('thin data still finishes at minItems when frozen early', () => {
    const { state } = runStaircase(['incorrect', 'incorrect']);
    expect(state.done).toBe(true);
    expect(state.itemsAnswered).toBe(DEFAULT_STAIRCASE.minItems);
    expect(state.itemsAnswered).toBeLessThan(DEFAULT_STAIRCASE.maxItems);
  });
});

describe('planetForClearedLevel / resultFromStaircase', () => {
  it('maps place-value clearance to Jupiter', () => {
    const idx = PLACEMENT_LEVELS.indexOf('placeValue');
    expect(planetForClearedLevel(idx)).toBe('jupiter');
  });

  it('maps add10 clearance to Earth with plain-language label', () => {
    let state = createStaircase({ minItems: 4, maxItems: 4, successThreshold: 2 });
    // Clear count10, count20, count100, add10 quickly with a tiny config by
    // manually setting cleared index.
    state = {
      ...state,
      clearedLevelIndex: PLACEMENT_LEVELS.indexOf('add10'),
      itemsAnswered: 4,
      done: true,
    };
    const result = resultFromStaircase(state);
    expect(result.startPlanet).toBe('earth');
    expect(result.labelKey).toBe('pl_label_earth');
    expect(result.summaryKey).toBe('place_sum_add');
  });
});

describe('skippedPlacement', () => {
  it('starts at the Sun with no ahead unlock', () => {
    const result = skippedPlacement();
    expect(result.startPlanet).toBe('sun');
    expect(result.unlockPlanet).toBe('sun');
    expect(result.summaryKey).toBe('place_sum_skip');
  });
});
