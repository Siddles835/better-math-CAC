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
import { isSoloClassCode, loadSoloProgress, saveSoloProgress } from '@/lib/solo';
import { patchStudentFields } from '@/lib/classroom';

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

const firestorePort: DataPort = {
  kind: 'firestore',
  async patchStudent(classCode, studentKey, fields) {
    await patchStudentFields(classCode, studentKey, fields);
  },
  async getLearner(classCode, studentKey) {
    const snap = await getDoc(learnerDoc(classCode, studentKey));
    return snap.exists() ? (snap.data() as LearnerRecord) : null;
  },
  async saveLearner(classCode, studentKey, record) {
    await setDoc(learnerDoc(classCode, studentKey), record);
  },
  async listLearners(classCode) {
    const snap = await getDocs(collection(db, 'classrooms', classCode, 'learners'));
    const out: Record<string, LearnerRecord> = {};
    snap.forEach((item) => {
      out[item.id] = item.data() as LearnerRecord;
    });
    return out;
  },
  async listCurricula(classCode) {
    const snap = await getDocs(collection(db, 'classrooms', classCode, 'curricula'));
    return snap.docs.map((item) => item.data() as Curriculum);
  },
  async saveCurriculum(curriculum) {
    await setDoc(doc(db, 'classrooms', curriculum.classCode, 'curricula', curriculum.id), curriculum);
  },
  async deleteCurriculum(classCode, curriculumId) {
    await deleteDoc(doc(db, 'classrooms', classCode, 'curricula', curriculumId));
    const assigned = await getDocs(collection(db, 'classrooms', classCode, 'assignments'));
    await Promise.all(
      assigned.docs
        .filter((item) => (item.data() as Assignment).curriculumId === curriculumId)
        .map((item) => deleteDoc(item.ref))
    );
  },
  async listAssignments(classCode) {
    const snap = await getDocs(collection(db, 'classrooms', classCode, 'assignments'));
    return snap.docs.map((item) => item.data() as Assignment);
  },
  async saveAssignment(classCode, assignment) {
    await setDoc(doc(db, 'classrooms', classCode, 'assignments', assignment.id), assignment);
  },
  async deleteAssignment(classCode, assignmentId) {
    await deleteDoc(doc(db, 'classrooms', classCode, 'assignments', assignmentId));
  },
  async getGoals(classCode) {
    const snap = await getDoc(doc(db, 'classrooms', classCode, 'meta', 'pilot'));
    return snap.exists() ? (snap.data() as PilotGoals) : null;
  },
  async saveGoals(classCode, goals) {
    await setDoc(doc(db, 'classrooms', classCode, 'meta', 'pilot'), goals);
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
