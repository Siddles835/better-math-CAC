import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { deleteClassOwnedDocs, deleteLearnerDoc } from '@/lib/data/firestoreExtra';
import type { Assignment, Curriculum, LearnerRecord, PilotGoals } from '@/content/types';
import { isDemoMode } from '@/lib/demo/mode';
import {
  demoDeleteAssignment,
  demoDeleteCurriculum,
  demoGetGoals,
  demoGetLearner,
  demoListAssignments,
  demoListCurricula,
  demoListLearners,
  demoPatchStudent,
  demoSaveAssignment,
  demoSaveCurriculum,
  demoSaveGoals,
  demoSaveLearner,
} from '@/lib/demo/store';
import { db } from '@/lib/firebase';
import { stripUndefined } from '@/lib/data/stripUndefined';
import { isSoloClassCode, loadSoloProgress, saveSoloProgress } from '@/lib/solo';
import { patchStudentFields } from '@/lib/classroom';
import { withTimeout } from '@/lib/asyncTimeout';
import { isPermissionDenied } from '@/lib/data/firebaseErrors';
import {
  mirrorDeleteAssignment,
  mirrorDeleteCurriculum,
  mirrorGetGoals,
  mirrorGetLearner,
  mirrorListAssignments,
  mirrorListCurricula,
  mirrorListLearners,
  mirrorSaveAssignment,
  mirrorSaveCurriculum,
  mirrorSaveGoals,
  mirrorSaveLearner,
} from '@/lib/data/classMirror';

export interface DataPort {
  kind: 'firestore' | 'solo' | 'demo';
  patchStudent(classCode: string, studentKey: string, fields: Record<string, unknown>): Promise<void>;
  getLearner(classCode: string, studentKey: string): Promise<LearnerRecord | null>;
  saveLearner(classCode: string, studentKey: string, record: LearnerRecord): Promise<void>;
  listLearners(classCode: string): Promise<Record<string, LearnerRecord>>;
  listCurricula(classCode: string): Promise<Curriculum[]>;
  saveCurriculum(curriculum: Curriculum): Promise<void>;
  deleteCurriculum(classCode: string, curriculumId: string): Promise<void>;
  listAssignments(classCode: string): Promise<Assignment[]>;
  saveAssignment(classCode: string, assignment: Assignment): Promise<void>;
  deleteAssignment(classCode: string, assignmentId: string): Promise<void>;
  getGoals(classCode: string): Promise<PilotGoals | null>;
  saveGoals(classCode: string, goals: PilotGoals): Promise<void>;
}

const learnerDoc = (classCode: string, studentKey: string) =>
  doc(db, 'classrooms', classCode, 'learners', studentKey);

const asRecord = <T,>(value: unknown): T | null => (value ? (value as T) : null);

/** Prefer subcollections; if rules deny them, use the classroom parent mirror. */
const withMirrorFallback = async <T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> => {
  try {
    return await primary();
  } catch (error) {
    if (!isPermissionDenied(error)) throw error;
    return fallback();
  }
};

const firestorePort: DataPort = {
  kind: 'firestore',
  async patchStudent(classCode, studentKey, fields) {
    await patchStudentFields(classCode, studentKey, stripUndefined(fields));
  },
  async getLearner(classCode, studentKey) {
    return withMirrorFallback(
      async () => {
        const snap = await withTimeout(
          getDoc(learnerDoc(classCode, studentKey)),
          5000,
          'firestore.getLearner'
        );
        return snap.exists() ? (snap.data() as LearnerRecord) : null;
      },
      () => mirrorGetLearner(classCode, studentKey)
    );
  },
  async saveLearner(classCode, studentKey, record) {
    await withMirrorFallback(
      async () => {
        await withTimeout(
          setDoc(learnerDoc(classCode, studentKey), stripUndefined(record)),
          4000,
          'firestore.saveLearner'
        );
      },
      () => mirrorSaveLearner(classCode, studentKey, record)
    );
  },
  async listLearners(classCode) {
    return withMirrorFallback(async () => {
      const snap = await withTimeout(
        getDocs(collection(db, 'classrooms', classCode, 'learners')),
        8000,
        'firestore.listLearners'
      );
      const out: Record<string, LearnerRecord> = {};
      snap.forEach((item) => {
        out[item.id] = item.data() as LearnerRecord;
      });
      return out;
    }, () => mirrorListLearners(classCode));
  },
  async listCurricula(classCode) {
    return withMirrorFallback(async () => {
      const snap = await withTimeout(
        getDocs(collection(db, 'classrooms', classCode, 'curricula')),
        8000,
        'firestore.listCurricula'
      );
      return snap.docs.map((item) => item.data() as Curriculum);
    }, () => mirrorListCurricula(classCode));
  },
  async saveCurriculum(curriculum) {
    await withMirrorFallback(
      async () => {
        await withTimeout(
          setDoc(
            doc(db, 'classrooms', curriculum.classCode, 'curricula', curriculum.id),
            stripUndefined(curriculum)
          ),
          5000,
          'firestore.saveCurriculum'
        );
      },
      () => mirrorSaveCurriculum(curriculum)
    );
  },
  async deleteCurriculum(classCode, curriculumId) {
    await withMirrorFallback(
      async () => {
        await withTimeout(
          deleteDoc(doc(db, 'classrooms', classCode, 'curricula', curriculumId)),
          5000,
          'firestore.deleteCurriculum'
        );
        const assigned = await withTimeout(
          getDocs(collection(db, 'classrooms', classCode, 'assignments')),
          8000,
          'firestore.listAssignmentsForDelete'
        );
        await Promise.all(
          assigned.docs
            .filter((item) => (item.data() as Assignment).curriculumId === curriculumId)
            .map((item) => deleteDoc(item.ref))
        );
      },
      () => mirrorDeleteCurriculum(classCode, curriculumId)
    );
  },
  async listAssignments(classCode) {
    return withMirrorFallback(async () => {
      const snap = await withTimeout(
        getDocs(collection(db, 'classrooms', classCode, 'assignments')),
        8000,
        'firestore.listAssignments'
      );
      return snap.docs.map((item) => item.data() as Assignment);
    }, () => mirrorListAssignments(classCode));
  },
  async saveAssignment(classCode, assignment) {
    await withMirrorFallback(
      async () => {
        await withTimeout(
          setDoc(
            doc(db, 'classrooms', classCode, 'assignments', assignment.id),
            stripUndefined(assignment)
          ),
          5000,
          'firestore.saveAssignment'
        );
      },
      () => mirrorSaveAssignment(classCode, assignment)
    );
  },
  async deleteAssignment(classCode, assignmentId) {
    await withMirrorFallback(
      async () => {
        await withTimeout(
          deleteDoc(doc(db, 'classrooms', classCode, 'assignments', assignmentId)),
          5000,
          'firestore.deleteAssignment'
        );
      },
      () => mirrorDeleteAssignment(classCode, assignmentId)
    );
  },
  async getGoals(classCode) {
    return withMirrorFallback(async () => {
      const snap = await withTimeout(
        getDoc(doc(db, 'classrooms', classCode, 'meta', 'pilot')),
        5000,
        'firestore.getGoals'
      );
      return snap.exists() ? (snap.data() as PilotGoals) : null;
    }, () => mirrorGetGoals(classCode));
  },
  async saveGoals(classCode, goals) {
    await withMirrorFallback(
      async () => {
        await withTimeout(
          setDoc(doc(db, 'classrooms', classCode, 'meta', 'pilot'), stripUndefined(goals)),
          5000,
          'firestore.saveGoals'
        );
      },
      () => mirrorSaveGoals(classCode, goals)
    );
  },
};

const soloPort: DataPort = {
  kind: 'solo',
  async patchStudent(_classCode, _studentKey, fields) {
    const { patchSoloProgressFields } = await import('@/lib/solo');
    patchSoloProgressFields(fields);
  },
  async getLearner() {
    return asRecord<LearnerRecord>(loadSoloProgress()?.learner);
  },
  async saveLearner(_classCode, _studentKey, record) {
    const current = loadSoloProgress();
    if (!current) return;
    saveSoloProgress({ ...current, learner: record });
  },
  async listLearners() {
    const learner = loadSoloProgress()?.learner;
    const name = loadSoloProgress()?.nickname ?? 'solo';
    return learner ? { [name]: learner } : {};
  },
  async listCurricula() {
    return [];
  },
  async saveCurriculum() {
    return undefined;
  },
  async deleteCurriculum() {
    return undefined;
  },
  async listAssignments() {
    return [];
  },
  async saveAssignment() {
    return undefined;
  },
  async deleteAssignment() {
    return undefined;
  },
  async getGoals() {
    return null;
  },
  async saveGoals() {
    return undefined;
  },
};

const demoPort: DataPort = {
  kind: 'demo',
  async patchStudent(_classCode, studentKey, fields) {
    demoPatchStudent(studentKey, fields);
  },
  async getLearner(_classCode, studentKey) {
    return demoGetLearner(studentKey);
  },
  async saveLearner(_classCode, studentKey, record) {
    demoSaveLearner(studentKey, record);
  },
  async listLearners() {
    return demoListLearners();
  },
  async listCurricula() {
    return demoListCurricula();
  },
  async saveCurriculum(curriculum) {
    demoSaveCurriculum(curriculum);
  },
  async deleteCurriculum(_classCode, curriculumId) {
    demoDeleteCurriculum(curriculumId);
  },
  async listAssignments() {
    return demoListAssignments();
  },
  async saveAssignment(_classCode, assignment) {
    demoSaveAssignment(assignment);
  },
  async deleteAssignment(_classCode, assignmentId) {
    demoDeleteAssignment(assignmentId);
  },
  async getGoals() {
    return demoGetGoals();
  },
  async saveGoals(_classCode, goals) {
    demoSaveGoals(goals);
  },
};

export const getPort = (classCode?: string | null, soloFlag = false): DataPort => {
  if (isDemoMode()) return demoPort;
  if (soloFlag || isSoloClassCode(classCode)) return soloPort;
  return firestorePort;
};

export { deleteClassOwnedDocs, deleteLearnerDoc };
