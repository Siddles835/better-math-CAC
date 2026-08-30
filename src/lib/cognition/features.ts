import { getLessonForPlanet, getPlanetIndex, type PlanetId } from '@/lib/planets';
import type { CognitionFeatures, LessonCode } from './types';
import type { LessonTrace } from './trace';

const lessonCodeFor = (planet: PlanetId): LessonCode => {
  const lesson = getLessonForPlanet(planet);
  if (lesson === 'addition') return 1;
  if (lesson === 'subtraction') return 2;
  return 0;
};

const std = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const varSum = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(varSum);
};

export const extractFeatures = (planet: PlanetId, trace: LessonTrace): CognitionFeatures => {
  const events = trace.events;
  const taps = events.filter((e) => e.kind === 'tap');
  const gaps: number[] = [];
  for (let i = 1; i < taps.length; i++) {
    gaps.push((taps[i].t - taps[i - 1].t) / 1000);
  }

  const checks = events.filter((e) => e.kind === 'check');
  const lastCheck = checks[checks.length - 1];
  const value = lastCheck?.value ?? taps[taps.length - 1]?.value ?? 0;
  const target = lastCheck?.target ?? taps[taps.length - 1]?.target ?? 0;
  const correct = target > 0 && value === target ? 1 : 0;
  const overshoot = target > 0 ? Math.max(0, value - target) : 0;
  const undershoot = target > 0 ? Math.max(0, target - value) : 0;

  const resets = events.filter((e) => e.kind === 'reset').length;
  const restartFromOne =
    resets > 0 && taps.length >= 3 && taps.slice(0, 3).every((tap, i) => (tap.value ?? i + 1) === i + 1)
      ? 1
      : 0;

  const digit = 'digit' in trace ? trace.digit : null;
  const drawMatch = digit && target > 0 && digit.digit === target ? 1 : 0;

  return {
    planetIndex: getPlanetIndex(planet),
    lessonCode: lessonCodeFor(planet),
    timeToFirst: Math.min(30, Number(trace.timeToFirstSec().toFixed(2))),
    avgGap: gaps.length ? Number((gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2)) : 0,
    gapStd: Number(std(gaps).toFixed(2)),
    tapCount: taps.length,
    removeCount: events.filter((e) => e.kind === 'remove').length,
    retries: Math.max(0, checks.length - 1),
    overshoot,
    undershoot,
    correct,
    drawMatch,
    drawReversal: digit?.reversal ? 1 : 0,
    drawConfidence: digit ? Number(digit.confidence.toFixed(2)) : 0,
    equationSwap: 'equationSwap' in trace ? trace.equationSwap : 0,
    restartFromOne,
  };
};
