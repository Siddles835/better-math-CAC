import type { ExploreActivityId, ExploreCollectionItem, ExploreSignal } from './types';

export const EXPLORE_COLLECTION_KEY = 'mathlift.explore.collection';
export const EXPLORE_SIGNALS_KEY = 'mathlift.explore.signals';
export const EXPLORE_LAST_PROMPT_KEY = 'mathlift.explore.lastPrompt';

const COLLECTION_CAP = 40;
const SIGNALS_CAP = 40;

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

export const loadExploreCollection = (): ExploreCollectionItem[] => {
  const items = readJson<ExploreCollectionItem[]>(EXPLORE_COLLECTION_KEY, []);
  return Array.isArray(items) ? items : [];
};

export const saveExploreCollectionItem = (
  item: Omit<ExploreCollectionItem, 'id' | 'at'> & { id?: string; at?: number }
): ExploreCollectionItem[] => {
  const nextItem: ExploreCollectionItem = {
    id: item.id ?? `col-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    activityId: item.activityId,
    label: item.label,
    waysFound: item.waysFound,
    at: item.at ?? Date.now(),
  };
  const prev = loadExploreCollection();
  const next = [...prev, nextItem];
  const capped = next.length <= COLLECTION_CAP ? next : next.slice(next.length - COLLECTION_CAP);
  writeJson(EXPLORE_COLLECTION_KEY, capped);
  return capped;
};

export const loadExploreSignals = (): ExploreSignal[] => {
  const items = readJson<ExploreSignal[]>(EXPLORE_SIGNALS_KEY, []);
  return Array.isArray(items) ? items : [];
};

export const appendExploreSignal = (signal: ExploreSignal): ExploreSignal[] => {
  const prev = loadExploreSignals();
  const next = [...prev, signal];
  const capped = next.length <= SIGNALS_CAP ? next : next.slice(next.length - SIGNALS_CAP);
  writeJson(EXPLORE_SIGNALS_KEY, capped);
  return capped;
};

export const loadLastPromptSignature = (activityId: ExploreActivityId): string | null => {
  const map = readJson<Record<string, string>>(EXPLORE_LAST_PROMPT_KEY, {});
  return map[activityId] ?? null;
};

export const saveLastPromptSignature = (activityId: ExploreActivityId, signature: string): void => {
  const map = readJson<Record<string, string>>(EXPLORE_LAST_PROMPT_KEY, {});
  map[activityId] = signature;
  writeJson(EXPLORE_LAST_PROMPT_KEY, map);
};

/** Same deletion rules as other on-device progress: wipe Explore data with account/progress delete. */
export const clearExploreData = (): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(EXPLORE_COLLECTION_KEY);
  localStorage.removeItem(EXPLORE_SIGNALS_KEY);
  localStorage.removeItem(EXPLORE_LAST_PROMPT_KEY);
};
