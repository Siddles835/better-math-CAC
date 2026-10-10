import { getPathOrFoundations } from '@/content/catalog';
import type { LearnerRecord } from '@/content/types';
import { getPort } from '@/lib/data/port';
import { getClass } from '@/lib/classroom';
import { nicknameKey } from '@/lib/classroom';
import { learnerFromLegacy } from '@/lib/paths/progress';
import { getActiveStudent } from '@/lib/session';
import { isSoloClassCode, loadSoloProgress, soloProgressToStudent } from '@/lib/solo';
import { isDemoMode } from '@/lib/demo/mode';
import { demoGetClass } from '@/lib/demo/store';

const PENDING_PATH = 'mathlift:pending-path';

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

export const loadActiveLearner = async (): Promise<{
  classCode: string;
  studentKey: string;
  solo: boolean;
  record: LearnerRecord;
} | null> => {
  const active = getActiveStudent();
  if (!active) return null;
  const solo = !!(active.solo || isSoloClassCode(active.classCode));
  const studentKey = nicknameKey(active.nickname);
  const port = getPort(active.classCode, solo);
  const stored = await port.getLearner(active.classCode, studentKey);
  if (stored) return { classCode: active.classCode, studentKey, solo, record: stored };
  let legacy = null;
  if (solo) {
    const progress = loadSoloProgress(active.nickname);
    legacy = progress ? soloProgressToStudent(progress) : null;
  } else if (isDemoMode()) {
    legacy = demoGetClass().students[studentKey] ?? null;
  } else {
    const cls = await getClass(active.classCode);
    legacy = cls?.students?.[studentKey] ?? null;
  }
  const pathId = loadPendingPath() || 'foundations';
  const record = learnerFromLegacy(legacy, getPathOrFoundations(pathId).id);
  if (pathId !== 'foundations') record.activePathId = pathId;
  return { classCode: active.classCode, studentKey, solo, record };
};

export const saveActiveLearner = async (record: LearnerRecord): Promise<void> => {
  const active = getActiveStudent();
  if (!active) return;
  const solo = !!(active.solo || isSoloClassCode(active.classCode));
  await getPort(active.classCode, solo).saveLearner(active.classCode, nicknameKey(active.nickname), record);
};
