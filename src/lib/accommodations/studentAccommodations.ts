import type { AccessibilityPrefs } from '@/lib/accessibility';
import { DEFAULT_PREFS, withCalmMode } from '@/lib/accessibility';
import { SAMPLE_CLASS_CODE } from '@/lib/cognition/demoClass';
import { patchStudentFields } from '@/lib/classroom';
import { stripUndefined } from '@/lib/data/stripUndefined';
import {
  ACCOMMODATION_MATRIX,
  applyAccommodationPreset,
  clearAccommodationNeed,
  toggleAccommodationFeature,
  type AccommodationFeatureId,
  type AccommodationNeed,
} from './matrix';

/** Teacher-assigned needs and the resolved preference snapshot for one student. */
export interface StudentAccommodationRecord {
  needs: AccommodationNeed[];
  prefs: AccessibilityPrefs;
  updatedAt: number;
}

interface AppliedStamp {
  classCode: string;
  studentKey: string;
  updatedAt: number;
}

export interface ApplyDecision {
  prefs: AccessibilityPrefs;
  appliedUpdatedAt: number;
}

const SAMPLE_STORAGE_KEY = 'mathlift.sampleStudentAccommodations.v1';
const APPLIED_STORAGE_KEY = 'mathlift.appliedStudentAccommodations.v1';

const BOOL_PREF_KEYS = [
  'easyReadSpacing',
  'dyslexiaFont',
  'colorSafeLabels',
  'reduceMotion',
  'calmBackground',
  'focusMode',
  'autoReadAloud',
  'soundAsText',
  'muteSounds',
  'voiceEnabled',
  'naturalVoice',
  'biggerButtons',
  'breaks',
  'summaryFirst',
  'workedExampleFirst',
] as const satisfies readonly (keyof AccessibilityPrefs)[];

export const blankStudentAccommodations = (): StudentAccommodationRecord => ({
  needs: [],
  prefs: { ...DEFAULT_PREFS },
  updatedAt: 0,
});

export const isSampleClassCode = (classCode: string): boolean =>
  classCode.trim().toUpperCase() === SAMPLE_CLASS_CODE;

const sampleMapKey = (classCode: string, studentKey: string): string =>
  `${classCode.trim().toUpperCase()}:${studentKey}`;

/** Clamp a stored preference blob onto the known shape. */
export const prefsFromStored = (raw: unknown): AccessibilityPrefs => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFS };
  const merged: AccessibilityPrefs = { ...DEFAULT_PREFS, ...(raw as Partial<AccessibilityPrefs>) };
  if (merged.textSize !== 'normal' && merged.textSize !== 'large' && merged.textSize !== 'xlarge') {
    merged.textSize = DEFAULT_PREFS.textSize;
  }
  if (merged.pacing !== 'normal' && merged.pacing !== 'relaxed') merged.pacing = DEFAULT_PREFS.pacing;
  if (merged.speechRate !== 'slow' && merged.speechRate !== 'normal') {
    merged.speechRate = DEFAULT_PREFS.speechRate;
  }
  if (
    merged.answerMethod !== 'any' &&
    merged.answerMethod !== 'type' &&
    merged.answerMethod !== 'choose' &&
    merged.answerMethod !== 'draw'
  ) {
    merged.answerMethod = DEFAULT_PREFS.answerMethod;
  }
  if (
    merged.displayStyle !== 'playful' &&
    merged.displayStyle !== 'standard' &&
    merged.displayStyle !== 'minimal'
  ) {
    merged.displayStyle = DEFAULT_PREFS.displayStyle;
  }
  if (
    merged.colorTheme !== 'light' &&
    merged.colorTheme !== 'dark' &&
    merged.colorTheme !== 'contrast' &&
    merged.colorTheme !== 'system'
  ) {
    merged.colorTheme = DEFAULT_PREFS.colorTheme;
  }
  if (typeof merged.planetTheme !== 'string') merged.planetTheme = '';
  if (merged.voiceURI != null && typeof merged.voiceURI !== 'string') merged.voiceURI = null;
  if (typeof merged.cloudVoice !== 'string') merged.cloudVoice = DEFAULT_PREFS.cloudVoice;
  merged.lowVision = !!merged.lowVision;
  if (merged.lowVision) {
    merged.highContrast = true;
    merged.colorTheme = 'contrast';
  } else {
    merged.highContrast = false;
    if (merged.colorTheme === 'contrast') merged.colorTheme = 'dark';
  }
  for (const key of BOOL_PREF_KEYS) {
    merged[key] = !!merged[key];
  }
  return merged;
};

export const normalizeStudentAccommodations = (raw: unknown): StudentAccommodationRecord | null => {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Partial<StudentAccommodationRecord>;
  if (!Array.isArray(rec.needs) || !rec.prefs || typeof rec.prefs !== 'object') return null;
  const needs = rec.needs.filter(
    (need): need is AccommodationNeed => typeof need === 'string' && need in ACCOMMODATION_MATRIX
  );
  const updatedAt = typeof rec.updatedAt === 'number' && Number.isFinite(rec.updatedAt) ? rec.updatedAt : 0;
  return {
    needs,
    prefs: prefsFromStored(rec.prefs),
    updatedAt,
  };
};

const readSampleStore = (): Record<string, unknown> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SAMPLE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const loadSampleStudentAccommodations = (
  classCode: string,
  studentKey: string
): StudentAccommodationRecord | null => {
  if (!isSampleClassCode(classCode) || !studentKey) return null;
  return normalizeStudentAccommodations(readSampleStore()[sampleMapKey(classCode, studentKey)]);
};

const writeSampleStudentAccommodations = (
  classCode: string,
  studentKey: string,
  record: StudentAccommodationRecord
): void => {
  if (typeof window === 'undefined') return;
  const store = readSampleStore();
  store[sampleMapKey(classCode, studentKey)] = record;
  window.localStorage.setItem(SAMPLE_STORAGE_KEY, JSON.stringify(store));
};

/** Remote record wins. Sample class falls back to this browser. Otherwise a blank slate. */
export const accommodationsForStudent = (
  classCode: string,
  studentKey: string,
  stored: unknown
): StudentAccommodationRecord => {
  return (
    normalizeStudentAccommodations(stored) ??
    loadSampleStudentAccommodations(classCode, studentKey) ??
    blankStudentAccommodations()
  );
};

const stamped = (record: Omit<StudentAccommodationRecord, 'updatedAt'>): StudentAccommodationRecord => ({
  needs: record.needs,
  prefs: record.prefs,
  updatedAt: Date.now(),
});

export const toggleStudentNeed = (
  record: StudentAccommodationRecord,
  need: AccommodationNeed
): { record: StudentAccommodationRecord; turnedOn: boolean } => {
  if (record.needs.includes(need)) {
    const needs = record.needs.filter((item) => item !== need);
    return {
      turnedOn: false,
      record: stamped({
        needs,
        prefs: clearAccommodationNeed(record.prefs, need, needs),
      }),
    };
  }
  const needs = [...record.needs, need];
  let prefs = applyAccommodationPreset(record.prefs, need);
  if (prefs.calmBackground) prefs = withCalmMode(prefs, true);
  return { turnedOn: true, record: stamped({ needs, prefs }) };
};

export const toggleStudentFeature = (
  record: StudentAccommodationRecord,
  featureId: AccommodationFeatureId,
  enabled: boolean
): StudentAccommodationRecord => {
  const prefs = toggleAccommodationFeature(record.prefs, featureId, enabled);
  let needs = record.needs;
  if (featureId === 'highContrast') {
    needs = enabled
      ? needs.includes('lowVision')
        ? needs
        : [...needs, 'lowVision']
      : needs.filter((need) => need !== 'lowVision');
  }
  return stamped({ needs, prefs });
};

export const saveStudentAccommodations = async (
  classCode: string,
  studentKey: string,
  record: StudentAccommodationRecord
): Promise<void> => {
  if (!classCode.trim() || !studentKey) return;
  if (isSampleClassCode(classCode)) {
    writeSampleStudentAccommodations(classCode, studentKey, record);
    return;
  }
  await patchStudentFields(classCode, studentKey, {
    accommodations: stripUndefined(record),
  });
};

export const readAppliedStamp = (): AppliedStamp | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(APPLIED_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppliedStamp>;
    if (!parsed || typeof parsed.classCode !== 'string' || typeof parsed.studentKey !== 'string') return null;
    return {
      classCode: parsed.classCode,
      studentKey: parsed.studentKey,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
};

export const markStudentAccommodationApplied = (
  classCode: string,
  studentKey: string,
  updatedAt: number
): void => {
  if (typeof window === 'undefined') return;
  const stamp: AppliedStamp = { classCode, studentKey, updatedAt };
  window.localStorage.setItem(APPLIED_STORAGE_KEY, JSON.stringify(stamp));
};

/**
 * Decide whether this device should adopt a student's teacher-assigned prefs.
 * A newer teacher save wins. Switching to a student with no assignment clears
 * settings that were applied for someone else, so they do not leak across logins.
 * The same student keeps later device edits until the teacher saves again.
 */
export const decideStudentAccommodationApply = (
  classCode: string,
  studentKey: string,
  raw: unknown,
  applied: AppliedStamp | null = readAppliedStamp()
): ApplyDecision | null => {
  const code = classCode.trim().toUpperCase();
  const key = studentKey.trim().toLowerCase();
  if (!code || !key) return null;
  const record = normalizeStudentAccommodations(raw);
  const identityChanged =
    !applied ||
    applied.classCode.trim().toUpperCase() !== code ||
    applied.studentKey.trim().toLowerCase() !== key;

  if (record && record.updatedAt > 0) {
    if (identityChanged || record.updatedAt > (applied?.updatedAt ?? 0)) {
      return { prefs: record.prefs, appliedUpdatedAt: record.updatedAt };
    }
    return null;
  }

  if (applied && identityChanged && applied.updatedAt > 0) {
    return { prefs: { ...DEFAULT_PREFS }, appliedUpdatedAt: 0 };
  }
  return null;
};
