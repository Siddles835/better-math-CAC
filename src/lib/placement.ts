import type { PlanetId } from '@/lib/planets';

export type PlacementSkill = 'counting' | 'addition' | 'subtraction';

export interface PlacementQuestion {
  id: string;
  skill: PlacementSkill;
  /** Short kid-facing prompt (English source; UI translates via keys). */
  promptKey: string;
  /** Optional equation shown under the prompt. */
  equation?: string;
  /** Visual count for counting items (rendered as dots). */
  dots?: number;
  answer: number;
  choices: number[];
}

export interface PlacementResult {
  correct: number;
  total: number;
  /** Furthest skill band the learner cleared. */
  band: PlacementSkill | 'none';
  startPlanet: PlanetId;
  unlockPlanet: PlanetId;
  summaryKey: string;
}

/**
 * Three short items — one per topic band — so solo learners get an honest
 * starting unlock without a full adaptive battery.
 */
export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  {
    id: 'count-5',
    skill: 'counting',
    promptKey: 'ui:place_q_count',
    dots: 5,
    answer: 5,
    choices: [3, 4, 5, 6],
  },
  {
    id: 'add-3-2',
    skill: 'addition',
    promptKey: 'ui:place_q_add',
    equation: '3 + 2',
    answer: 5,
    choices: [4, 5, 6, 7],
  },
  {
    id: 'sub-7-2',
    skill: 'subtraction',
    promptKey: 'ui:place_q_sub',
    equation: '7 − 2',
    answer: 5,
    choices: [3, 4, 5, 9],
  },
];

/**
 * Map answers to a start + unlock planet.
 * Unlock is one step ahead of start (when possible) so the next world is visible.
 */
export const scorePlacement = (answers: Record<string, number>): PlacementResult => {
  const total = PLACEMENT_QUESTIONS.length;
  let correct = 0;
  let countingOk = false;
  let additionOk = false;
  let subtractionOk = false;

  for (const q of PLACEMENT_QUESTIONS) {
    if (answers[q.id] === q.answer) {
      correct += 1;
      if (q.skill === 'counting') countingOk = true;
      if (q.skill === 'addition') additionOk = true;
      if (q.skill === 'subtraction') subtractionOk = true;
    }
  }

  if (countingOk && additionOk && subtractionOk) {
    return {
      correct,
      total,
      band: 'subtraction',
      startPlanet: 'saturn',
      unlockPlanet: 'uranus',
      summaryKey: 'ui:place_sum_sub',
    };
  }
  if (countingOk && additionOk) {
    return {
      correct,
      total,
      band: 'addition',
      startPlanet: 'earth',
      unlockPlanet: 'mars',
      summaryKey: 'ui:place_sum_add',
    };
  }
  if (countingOk) {
    return {
      correct,
      total,
      band: 'counting',
      startPlanet: 'mercury',
      unlockPlanet: 'venus',
      summaryKey: 'ui:place_sum_count',
    };
  }
  return {
    correct,
    total,
    band: 'none',
    startPlanet: 'sun',
    unlockPlanet: 'mercury',
    summaryKey: 'ui:place_sum_sun',
  };
};

/** Skip the check: begin at the Sun; later planets unlock by finishing lessons. */
export const skippedPlacement = (): PlacementResult => ({
  correct: 0,
  total: PLACEMENT_QUESTIONS.length,
  band: 'none',
  startPlanet: 'sun',
  unlockPlanet: 'sun',
  summaryKey: 'ui:place_sum_skip',
});
