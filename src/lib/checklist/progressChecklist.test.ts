// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildChecklistState,
  clearChecklistForPlanet,
  loadCompletedStepIds,
  markChecklistStepComplete,
  saveCompletedStepIds,
  stepIdFor,
  syncChecklistWithPlanetStep,
} from './progressChecklist';

describe('progressChecklist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds completed / current / upcoming from planet step', () => {
    const state = buildChecklistState('sun', 4, 2, [stepIdFor('sun', 0)]);
    expect(state.steps.map((s) => s.status)).toEqual([
      'completed',
      'completed',
      'current',
      'upcoming',
    ]);
    expect(state.currentObjectiveKey).toBe('checklist_objective');
  });

  it('persists completed step ids by class + student + planet', () => {
    saveCompletedStepIds('ABC', 'BraveTiger', 'earth', [stepIdFor('earth', 0)]);
    expect(loadCompletedStepIds('abc', 'bravetiger', 'earth')).toEqual([stepIdFor('earth', 0)]);

    const next = markChecklistStepComplete('ABC', 'BraveTiger', 'earth', 1);
    expect(next).toContain(stepIdFor('earth', 1));
    expect(loadCompletedStepIds('ABC', 'BraveTiger', 'mars')).toEqual([]);
  });

  it('syncs earlier steps when planet step advances', () => {
    const ids = syncChecklistWithPlanetStep('DEMO', 'Kid1', 'mars', 3, 6);
    expect(ids).toEqual([
      stepIdFor('mars', 0),
      stepIdFor('mars', 1),
      stepIdFor('mars', 2),
    ]);
    clearChecklistForPlanet('DEMO', 'Kid1', 'mars');
    expect(loadCompletedStepIds('DEMO', 'Kid1', 'mars')).toEqual([]);
  });
});
