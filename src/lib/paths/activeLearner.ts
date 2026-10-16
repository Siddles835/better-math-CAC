import { getPath, resolveClassroomPathId } from '@/content/catalog';
import type { LearnerRecord } from '@/content/types';
import { getPort } from '@/lib/data/port';
import { getClass, nicknameKey } from '@/lib/classroom';
import { learnerFromLegacy } from '@/lib/paths/progress';
import { getActiveStudent } from '@/lib/session';
import { isSoloClassCode, loadSoloProgress, soloProgressToStudent } from '@/lib/solo';
import { isDemoMode } from '@/lib/demo/mode';
import { demoGetClass } from '@/lib/demo/store';
import { withTimeout, withTimeoutFallback } from '@/lib/asyncTimeout';
import { getClassroomPathwayId, setSolarPathHint } from '@/lib/planets';

const PENDING_PATH = 'mathlift:pending-path';
const READ_MS = 5000;
const WRITE_MS = 4000;

export const savePendingPath = (pathId: string): void => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PENDING_PATH, pathId);
};

export const loadPendingPath = (): string | null => {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(PENDING_PATH);
};

export const clearPendingPath = (): void => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(PENDING_PATH);
};

/**
 * Classroom students only use the two solar pathways.
 * Legacy topic ids (addition, multiplication, …) map onto those pathways.
 */
export const normalizePathId = (pathId: string | null | undefined): string => {
  if (!pathId || pathId === 'all') return 'foundations';
  if (getPath(pathId)?.id === pathId && (pathId === 'foundations' || pathId === 'operations')) {
    return pathId;
  }
  return resolveClassroomPathId(pathId);
};

export const loadActiveLearner = async (): Promise<{
  classCode: string;
  studentKey: string;
  solo: boolean;
  record: LearnerRecord;
} | null> => {
  try {
    const active = getActiveStudent();
    if (!active) return null;
    const solo = !!(active.solo || isSoloClassCode(active.classCode));
    const studentKey = nicknameKey(active.nickname);
    const port = getPort(active.classCode, solo);

    const stored = await withTimeoutFallback(
      port.getLearner(active.classCode, studentKey),
      READ_MS,
      null,
      'getLearner'
    );
    let classPathway: string | null = null;
    if (!solo) {
      const cls = isDemoMode()
        ? demoGetClass()
        : await withTimeoutFallback(getClass(active.classCode), READ_MS, null, 'getClass');
      if (cls) classPathway = getClassroomPathwayId(cls);
    }

    if (stored) {
      const pathId = normalizePathId(
        solo ? stored.activePathId : classPathway || stored.activePathId
      );
      setSolarPathHint(pathId);
      const record = {
        ...stored,
        activePathId: pathId,
      };
      return { classCode: active.classCode, studentKey, solo, record };
    }

    let legacy = null;
    if (solo) {
      const progress = loadSoloProgress(active.nickname);
      legacy = progress ? soloProgressToStudent(progress) : null;
    } else if (isDemoMode()) {
      legacy = demoGetClass().students[studentKey] ?? null;
    } else {
      const cls = await withTimeoutFallback(
        getClass(active.classCode),
        READ_MS,
        null,
        'getClass'
      );
      legacy = cls?.students?.[studentKey] ?? null;
      if (cls) classPathway = getClassroomPathwayId(cls);
    }

    const pending = loadPendingPath();
    const pathId = normalizePathId(pending || classPathway || 'foundations');
    if (pending) clearPendingPath();
    setSolarPathHint(pathId);
    const record = learnerFromLegacy(legacy, pathId);
    record.activePathId = pathId;
    return { classCode: active.classCode, studentKey, solo, record };
  } catch (error) {
    console.error('loadActiveLearner failed', error);
    return null;
  }
};

export const saveActiveLearner = async (record: LearnerRecord): Promise<void> => {
  const active = getActiveStudent();
  if (!active) return;
  const solo = !!(active.solo || isSoloClassCode(active.classCode));
  const safe: LearnerRecord = {
    ...record,
    activePathId: normalizePathId(record.activePathId),
  };
  try {
    await withTimeout(
      getPort(active.classCode, solo).saveLearner(
        active.classCode,
        nicknameKey(active.nickname),
        safe
      ),
      WRITE_MS,
      'saveLearner'
    );
  } catch (error) {
    console.error('Could not save learner progress', error);
  }
};
