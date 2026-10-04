import { describe, expect, it } from 'vitest';
import { PLACEMENT_QUESTIONS, scorePlacement, skippedPlacement } from './placement';

describe('scorePlacement', () => {
  it('places at the Sun when every answer is wrong', () => {
    const answers = Object.fromEntries(PLACEMENT_QUESTIONS.map((q) => [q.id, -1]));
    const result = scorePlacement(answers);
    expect(result.startPlanet).toBe('sun');
    expect(result.unlockPlanet).toBe('mercury');
    expect(result.band).toBe('none');
    expect(result.correct).toBe(0);
  });

  it('unlocks Venus after counting only', () => {
    const answers = Object.fromEntries(
      PLACEMENT_QUESTIONS.map((q) => [q.id, q.skill === 'counting' ? q.answer : -1])
    );
    const result = scorePlacement(answers);
    expect(result.startPlanet).toBe('mercury');
    expect(result.unlockPlanet).toBe('venus');
    expect(result.band).toBe('counting');
  });

  it('unlocks Mars after counting and addition', () => {
    const answers = Object.fromEntries(
      PLACEMENT_QUESTIONS.map((q) => [
        q.id,
        q.skill === 'subtraction' ? -1 : q.answer,
      ])
    );
    const result = scorePlacement(answers);
    expect(result.startPlanet).toBe('earth');
    expect(result.unlockPlanet).toBe('mars');
    expect(result.band).toBe('addition');
  });

  it('unlocks Uranus when all three bands pass', () => {
    const answers = Object.fromEntries(PLACEMENT_QUESTIONS.map((q) => [q.id, q.answer]));
    const result = scorePlacement(answers);
    expect(result.startPlanet).toBe('saturn');
    expect(result.unlockPlanet).toBe('uranus');
    expect(result.band).toBe('subtraction');
    expect(result.correct).toBe(3);
  });
});

describe('skippedPlacement', () => {
  it('starts at the Sun with no ahead unlock', () => {
    const result = skippedPlacement();
    expect(result.startPlanet).toBe('sun');
    expect(result.unlockPlanet).toBe('sun');
    expect(result.summaryKey).toBe('ui:place_sum_skip');
  });
});
