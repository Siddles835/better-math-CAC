import type { PlanetId } from '@/lib/planets';

export interface ChecklistStep {
  id: string;
  index: number;
  labelKey: string;
  status: 'completed' | 'current' | 'upcoming';
}

export interface ChecklistState {
  planetId: PlanetId;
  totalSteps: number;
  currentStep: number;
  completedIds: string[];
  steps: ChecklistStep[];
  currentObjectiveKey: string;
}

const STORAGE_KEY = 'mathlift.progressChecklist.v1';

export type ChecklistStore = Record<string, string[]>;

export const checklistStorageKey = (
  classCode: string,
  studentKey: string,
  planetId: PlanetId
): string => `${classCode.trim().toLowerCase()}::${studentKey.trim().toLowerCase()}::${planetId}`;

export const stepIdFor = (planetId: PlanetId, index: number): string =>
  `${planetId}:step:${index}`;

export const buildChecklistSteps = (
  planetId: PlanetId,
  totalSteps: number,
  currentStep: number,
  completedIds: readonly string[]
): ChecklistStep[] => {
  const total = Math.max(1, Math.floor(totalSteps));
  const current = Math.min(Math.max(0, Math.floor(currentStep)), total - 1);
  const done = new Set(completedIds);
  return Array.from({ length: total }, (_, index) => {
    const id = stepIdFor(planetId, index);
    let status: ChecklistStep['status'] = 'upcoming';
    if (done.has(id) || index < current) status = 'completed';
    else if (index === current) status = 'current';
    return {
      id,
      index,
      labelKey: 'checklist_step',
      status,
    };
  });
};

export const buildChecklistState = (
  planetId: PlanetId,
  totalSteps: number,
  currentStep: number,
  completedIds: readonly string[]
): ChecklistState => {
  const steps = buildChecklistSteps(planetId, totalSteps, currentStep, completedIds);
  return {
    planetId,
    totalSteps: Math.max(1, Math.floor(totalSteps)),
    currentStep: Math.min(Math.max(0, Math.floor(currentStep)), Math.max(0, totalSteps - 1)),
    completedIds: [...completedIds],
    steps,
    currentObjectiveKey: 'checklist_objective',
  };
};

const readStore = (): ChecklistStore => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ChecklistStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeStore = (store: ChecklistStore): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* private mode / quota */
  }
};

export const loadCompletedStepIds = (
  classCode: string,
  studentKey: string,
  planetId: PlanetId
): string[] => {
  const key = checklistStorageKey(classCode, studentKey, planetId);
  const ids = readStore()[key];
  return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
};

export const saveCompletedStepIds = (
  classCode: string,
  studentKey: string,
  planetId: PlanetId,
  completedIds: readonly string[]
): string[] => {
  const key = checklistStorageKey(classCode, studentKey, planetId);
  const next = [...new Set(completedIds)];
  const store = readStore();
  store[key] = next;
  writeStore(store);
  return next;
};

/** Mark every step before `currentStep` complete and persist. */
export const syncChecklistWithPlanetStep = (
  classCode: string,
  studentKey: string,
  planetId: PlanetId,
  currentStep: number,
  totalSteps: number
): string[] => {
  const existing = loadCompletedStepIds(classCode, studentKey, planetId);
  const autoDone = Array.from({ length: Math.max(0, currentStep) }, (_, index) =>
    stepIdFor(planetId, index)
  );
  const merged = [...new Set([...existing, ...autoDone])].filter((id) => {
    const match = id.match(new RegExp(`^${planetId}:step:(\\d+)$`));
    if (!match) return false;
    return Number(match[1]) < totalSteps;
  });
  return saveCompletedStepIds(classCode, studentKey, planetId, merged);
};

export const markChecklistStepComplete = (
  classCode: string,
  studentKey: string,
  planetId: PlanetId,
  stepIndex: number
): string[] => {
  const existing = loadCompletedStepIds(classCode, studentKey, planetId);
  return saveCompletedStepIds(classCode, studentKey, planetId, [
    ...existing,
    stepIdFor(planetId, stepIndex),
  ]);
};

export const clearChecklistForPlanet = (
  classCode: string,
  studentKey: string,
  planetId: PlanetId
): void => {
  const key = checklistStorageKey(classCode, studentKey, planetId);
  const store = readStore();
  delete store[key];
  writeStore(store);
};
