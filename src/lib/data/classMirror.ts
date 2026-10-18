/**
 * Parent-document mirror for class workshop data.
 *
 * Some deployed Firestore rules allow the classroom document but deny nested
 * subcollections (learners / curricula / assignments / meta). When that happens
 * we store the same payloads on the parent doc so teachers can still use the
 * Curriculum Workshop and Pilot Overview.
 */
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { Assignment, Curriculum, LearnerRecord, PilotGoals } from '@/content/types';
import { db } from '@/lib/firebase';
import { stripUndefined } from '@/lib/data/stripUndefined';
import { withTimeout } from '@/lib/asyncTimeout';

const CURRICULA_FIELD = 'mathliftCurricula';
const ASSIGNMENTS_FIELD = 'mathliftAssignments';
const LEARNERS_FIELD = 'mathliftLearners';
const GOALS_FIELD = 'mathliftPilotGoals';

type MirrorBag = {
  [CURRICULA_FIELD]?: Curriculum[];
  [ASSIGNMENTS_FIELD]?: Assignment[];
  [LEARNERS_FIELD]?: Record<string, LearnerRecord>;
  [GOALS_FIELD]?: PilotGoals;
};

const classroomRef = (classCode: string) => doc(db, 'classrooms', classCode);

const readMirror = async (classCode: string): Promise<MirrorBag> => {
  const snap = await withTimeout(getDoc(classroomRef(classCode)), 5000, 'mirror.getClassroom');
  return snap.exists() ? (snap.data() as MirrorBag) : {};
};

const writeMirror = async (classCode: string, patch: MirrorBag): Promise<void> => {
  const clean = stripUndefined(patch);
  try {
    await withTimeout(updateDoc(classroomRef(classCode), clean), 5000, 'mirror.update');
  } catch (error) {
    // New / sparse docs may need setDoc merge when updateDoc fails.
    await withTimeout(setDoc(classroomRef(classCode), clean, { merge: true }), 5000, 'mirror.set');
    void error;
  }
};

export const mirrorListCurricula = async (classCode: string): Promise<Curriculum[]> => {
  const data = await readMirror(classCode);
  return Array.isArray(data[CURRICULA_FIELD]) ? data[CURRICULA_FIELD]! : [];
};

export const mirrorSaveCurriculum = async (curriculum: Curriculum): Promise<void> => {
  const list = await mirrorListCurricula(curriculum.classCode);
  const next = [...list.filter((item) => item.id !== curriculum.id), curriculum];
  await writeMirror(curriculum.classCode, { [CURRICULA_FIELD]: next });
};

export const mirrorDeleteCurriculum = async (classCode: string, curriculumId: string): Promise<void> => {
  const list = await mirrorListCurricula(classCode);
  const assignments = await mirrorListAssignments(classCode);
  await writeMirror(classCode, {
    [CURRICULA_FIELD]: list.filter((item) => item.id !== curriculumId),
    [ASSIGNMENTS_FIELD]: assignments.filter((item) => item.curriculumId !== curriculumId),
  });
};

export const mirrorListAssignments = async (classCode: string): Promise<Assignment[]> => {
  const data = await readMirror(classCode);
  return Array.isArray(data[ASSIGNMENTS_FIELD]) ? data[ASSIGNMENTS_FIELD]! : [];
};

export const mirrorSaveAssignment = async (classCode: string, assignment: Assignment): Promise<void> => {
  const list = await mirrorListAssignments(classCode);
  const next = [...list.filter((item) => item.id !== assignment.id), assignment];
  await writeMirror(classCode, { [ASSIGNMENTS_FIELD]: next });
};

export const mirrorDeleteAssignment = async (classCode: string, assignmentId: string): Promise<void> => {
  const list = await mirrorListAssignments(classCode);
  await writeMirror(classCode, {
    [ASSIGNMENTS_FIELD]: list.filter((item) => item.id !== assignmentId),
  });
};

export const mirrorListLearners = async (classCode: string): Promise<Record<string, LearnerRecord>> => {
  const data = await readMirror(classCode);
  const learners = data[LEARNERS_FIELD];
  return learners && typeof learners === 'object' ? learners : {};
};

export const mirrorGetLearner = async (
  classCode: string,
  studentKey: string
): Promise<LearnerRecord | null> => {
  const learners = await mirrorListLearners(classCode);
  return learners[studentKey] ?? null;
};

export const mirrorSaveLearner = async (
  classCode: string,
  studentKey: string,
  record: LearnerRecord
): Promise<void> => {
  const learners = await mirrorListLearners(classCode);
  await writeMirror(classCode, {
    [LEARNERS_FIELD]: { ...learners, [studentKey]: record },
  });
};

export const mirrorGetGoals = async (classCode: string): Promise<PilotGoals | null> => {
  const data = await readMirror(classCode);
  return data[GOALS_FIELD] ?? null;
};

export const mirrorSaveGoals = async (classCode: string, goals: PilotGoals): Promise<void> => {
  await writeMirror(classCode, { [GOALS_FIELD]: goals });
};
