import type { Diagnosis } from '@/lib/cognition';
import type { LastQuizSummary, LessonType, StudentState } from '@/lib/classroom';
import { nicknameKey, normalizeLabel } from '@/lib/classroom';
import {
  getLessonForPlanet,
  normalizePlanetId,
  planetsBefore,
  type PlanetId,
} from '@/lib/planets';
import { isArrayUnion } from '@/lib/studentWrites';

/** Reserved class-code marker for device-only solo learners (never a Firestore doc). */
export const SOLO_CLASS_CODE = 'solo';

export const SOLO_PROGRESS_KEY = 'better-math:solo-progress';

export interface SoloProgress {
  nickname: string;
  displayName: string;
  planet: PlanetId;
  lesson: LessonType;
  unlockPlanet: PlanetId;
  completedPlanets: string[];
  planetSteps: Record<string, number>;
  lastPlanet?: string;
  lastQuiz?: LastQuizSummary;
  lastDiagnosis?: Diagnosis;
  diagnosisHistory?: StudentState['diagnosisHistory'];
  lastUpdated: number;
}

export const isSoloClassCode = (classCode?: string | null): boolean =>
  normalizeLabel(classCode ?? '').toLowerCase() === SOLO_CLASS_CODE;

export const loadSoloProgress = (nickname?: string): SoloProgress | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SOLO_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SoloProgress;
    if (!parsed?.nickname || !parsed.unlockPlanet) return null;
    if (nickname && nicknameKey(parsed.nickname) !== nicknameKey(nickname)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveSoloProgress = (progress: SoloProgress): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    SOLO_PROGRESS_KEY,
    JSON.stringify({ ...progress, lastUpdated: Date.now() })
  );
};

export const clearSoloProgress = (): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(SOLO_PROGRESS_KEY);
};

export const soloProgressToStudent = (progress: SoloProgress): StudentState => ({
  nickname: progress.displayName || progress.nickname,
  planet: progress.planet,
  lesson: progress.lesson,
  completedPlanets: progress.completedPlanets ?? [],
  planetSteps: progress.planetSteps ?? {},
  lastPlanet: progress.lastPlanet,
  lastQuiz: progress.lastQuiz,
  lastDiagnosis: progress.lastDiagnosis,
  diagnosisHistory: progress.diagnosisHistory,
  lastUpdated: progress.lastUpdated,
});

/** Seed a solo learner after placement (or skip). */
export const createSoloProgress = (
  displayName: string,
  unlockPlanet: PlanetId,
  startPlanet?: PlanetId
): SoloProgress => {
  const unlock = normalizePlanetId(unlockPlanet) ?? 'sun';
  const start = normalizePlanetId(startPlanet) ?? unlock;
  const name = normalizeLabel(displayName);
  return {
    nickname: nicknameKey(name),
    displayName: name,
    planet: start,
    lesson: getLessonForPlanet(start),
    unlockPlanet: unlock,
    completedPlanets: planetsBefore(start),
    planetSteps: {},
    lastUpdated: Date.now(),
  };
};

export const patchSoloProgressFields = (
  fields: Record<string, unknown>
): SoloProgress | null => {
  const current = loadSoloProgress();
  if (!current) return null;
  const next: SoloProgress = {
    ...current,
    planetSteps: { ...(current.planetSteps ?? {}) },
    completedPlanets: [...(current.completedPlanets ?? [])],
    lastUpdated: Date.now(),
  };

  for (const [key, value] of Object.entries(fields)) {
    if (key.startsWith('planetSteps.') && typeof value === 'number') {
      const planet = key.slice('planetSteps.'.length);
      next.planetSteps[planet] = Math.max(next.planetSteps[planet] ?? 0, value);
      continue;
    }
    if (key === 'completedPlanets' && isArrayUnion(value)) {
      const set = new Set([...(next.completedPlanets ?? []), ...value.__arrayUnion]);
      next.completedPlanets = Array.from(set);
      continue;
    }
    if (key === 'planetSteps' && value && typeof value === 'object') {
      next.planetSteps = { ...next.planetSteps, ...(value as Record<string, number>) };
      continue;
    }
    (next as unknown as Record<string, unknown>)[key] = value;
  }

  if (typeof next.planet === 'string') {
    next.planet = normalizePlanetId(next.planet) ?? next.planet;
  }
  if (typeof next.unlockPlanet === 'string') {
    next.unlockPlanet = normalizePlanetId(next.unlockPlanet) ?? next.unlockPlanet;
  }

  saveSoloProgress(next);
  return next;
};
