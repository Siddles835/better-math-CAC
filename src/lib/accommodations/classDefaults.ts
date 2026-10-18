import type { AccessibilityPrefs } from '@/lib/accessibility';
import {
  ACCOMMODATION_MATRIX,
  applyAccommodationPreset,
  type AccommodationNeed,
} from './matrix';

const STORAGE_KEY = 'mathlift.classAccommodations.v1';

export interface ClassAccommodationDefaults {
  /** Selected need presets for the class (can stack; later wins on conflicts). */
  needs: AccommodationNeed[];
  /** Optional per-feature overrides after presets. */
  featureOverrides?: Partial<Record<string, boolean>>;
  updatedAt: number;
}

export type ClassAccommodationStore = Record<string, ClassAccommodationDefaults>;

const normalizeClassCode = (classCode: string): string => classCode.trim().toUpperCase();

const readStore = (): ClassAccommodationStore => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ClassAccommodationStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeStore = (store: ClassAccommodationStore): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
};

export const loadClassAccommodations = (classCode: string): ClassAccommodationDefaults | null => {
  const key = normalizeClassCode(classCode);
  if (!key) return null;
  const entry = readStore()[key];
  if (!entry || !Array.isArray(entry.needs)) return null;
  return {
    needs: entry.needs.filter((n): n is AccommodationNeed => n in ACCOMMODATION_MATRIX),
    featureOverrides: entry.featureOverrides,
    updatedAt: entry.updatedAt ?? 0,
  };
};

export const saveClassAccommodations = (
  classCode: string,
  defaults: Omit<ClassAccommodationDefaults, 'updatedAt'> & { updatedAt?: number }
): ClassAccommodationDefaults => {
  const key = normalizeClassCode(classCode);
  const next: ClassAccommodationDefaults = {
    needs: defaults.needs,
    featureOverrides: defaults.featureOverrides,
    updatedAt: defaults.updatedAt ?? Date.now(),
  };
  const store = readStore();
  store[key] = next;
  writeStore(store);
  return next;
};

export const clearClassAccommodations = (classCode: string): void => {
  const key = normalizeClassCode(classCode);
  const store = readStore();
  delete store[key];
  writeStore(store);
};

/** Merge class defaults into student prefs. Does not lock any setting. */
export const applyClassDefaultsToPrefs = (
  current: AccessibilityPrefs,
  classCode: string
): AccessibilityPrefs => {
  const defaults = loadClassAccommodations(classCode);
  if (!defaults || defaults.needs.length === 0) return current;
  let next = { ...current };
  for (const need of defaults.needs) {
    next = applyAccommodationPreset(next, need);
  }
  return next;
};

export const setClassNeeds = (
  classCode: string,
  needs: AccommodationNeed[]
): ClassAccommodationDefaults => {
  const existing = loadClassAccommodations(classCode);
  return saveClassAccommodations(classCode, {
    needs,
    featureOverrides: existing?.featureOverrides,
  });
};
