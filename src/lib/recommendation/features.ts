import type { LessonType } from '@/lib/classroom';

export interface LessonPerformance {
  planet: number;
  lessonDifficulty: number;

  accuracy: number;
  avgTime: number;

  hints: number;
  retries: number;

  improvement: number;
  consistency: number;
  streak: number;
}

/**
 * Convert the app's lesson information into the exact
 * feature shape expected by the ML model.
 */
export const createFeatures = (data: {
  planet: number;
  lessonDifficulty: number;
  correctAnswers: number;
  totalAnswers: number;
  totalTimeSeconds: number;
  hints?: number;
  retries?: number;
  improvement?: number;
  consistency?: number;
  streak?: number;
}): LessonPerformance => {
  const accuracy =
    data.totalAnswers > 0
      ? (data.correctAnswers / data.totalAnswers) * 100
      : 0;

  const avgTime =
    data.totalAnswers > 0
      ? data.totalTimeSeconds / data.totalAnswers
      : 0;

  return {
    planet: data.planet,
    lessonDifficulty: data.lessonDifficulty,

    accuracy,
    avgTime,

    hints: data.hints ?? 0,
    retries: data.retries ?? 0,

    improvement: data.improvement ?? 0,
    consistency: data.consistency ?? accuracy,
    streak: data.streak ?? 0,
  };
};