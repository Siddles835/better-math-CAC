import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  FieldPath,
} from 'firebase/firestore';

import { db } from './firebase';
import { getLessonForPlanet } from './planets';

export type LessonType =
  | 'counting'
  | 'addition'
  | 'subtraction';

export interface StudentState {
  nickname: string;
  planet: string;
  lesson: LessonType;

  /** Planets the student has fully completed. */
  completedPlanets?: string[];

  /** Last reached step index for each planet lesson. */
  planetSteps?: Record<string, number>;

  lastUpdated: number;
}

export interface Classroom {
  classCode: string;
  teacherCode: string;

  defaultStart?: {
    planet: string;
    lesson: LessonType;
  };

  students: Record<string, StudentState>;
}

// ============================================================
// CLOUD EXISTENCE CHECKS
// ============================================================

export const checkClassExists = async (
  classCode: string
): Promise<boolean> => {
  const docRef = doc(db, 'classrooms', classCode);
  const docSnap = await getDoc(docRef);

  return docSnap.exists();
};

export const checkStudentExists = async (
  classCode: string,
  nickname: string
): Promise<boolean> => {
  const cls = await getClass(classCode);

  return !!(
    cls &&
    cls.students &&
    cls.students[nickname]
  );
};

// ============================================================
// DATABASE OPERATIONS
// ============================================================

export const createClass = async (
  classCode: string,
  teacherCode?: string
) => {
  const docRef = doc(db, 'classrooms', classCode);

  await setDoc(docRef, {
    classCode,
    teacherCode:
      teacherCode ||
      Math.random().toString(36).slice(2, 8),
    students: {},
  });
};

export const getClass = async (
  classCode: string
): Promise<Classroom | null> => {
  const docRef = doc(db, 'classrooms', classCode);
  const docSnap = await getDoc(docRef);

  return docSnap.exists()
    ? (docSnap.data() as Classroom)
    : null;
};

// ============================================================
// REGISTER STUDENT
// ============================================================

export const registerStudent = async (
  classCode: string,
  nickname: string
): Promise<StudentState | null> => {
  const cls = await getClass(classCode);

  if (!cls) {
    return null;
  }

  const newStudent: StudentState = {
    nickname,
    planet: 'sun',
    lesson: 'counting',
    completedPlanets: [],
    planetSteps: {},
    lastUpdated: Date.now(),
  };

  /*
   * Update only this student's entry instead of replacing
   * the entire students object.
   *
   * FieldPath keeps nicknames safe even if they contain
   * characters that would otherwise have special meaning
   * in a Firestore field path.
   */
  const studentPath = new FieldPath(
    'students',
    nickname
  );

  await updateDoc(
    doc(db, 'classrooms', classCode),
    studentPath,
    newStudent
  );

  return newStudent;
};

// ============================================================
// UPDATE STUDENT
// ============================================================

export const updateStudentState = async (
  classCode: string,
  student: StudentState
) => {
  const cls = await getClass(classCode);

  if (!cls) {
    return;
  }

  const updatedStudent: StudentState = {
    ...student,
    lastUpdated: Date.now(),
  };

  /*
   * Only update this student's document field.
   *
   * This is much safer than:
   *
   *   students: {
   *     ...cls.students,
   *     [student.nickname]: student
   *   }
   *
   * because teacher and student devices can otherwise
   * overwrite each other's classroom state.
   */

  const studentPath = new FieldPath(
    'students',
    student.nickname
  );

  await updateDoc(
    doc(db, 'classrooms', classCode),
    studentPath,
    updatedStudent
  );
};

// ============================================================
// TEACHER DEFAULT START
// ============================================================

export const setClassDefaultStart = async (
  classCode: string,
  planet: string
) => {
  const lesson = getLessonForPlanet(planet);

  await updateDoc(
    doc(db, 'classrooms', classCode),
    {
      defaultStart: {
        planet,
        lesson,
      },
    }
  );
};

// ============================================================
// REAL-TIME STREAMING
// ============================================================
//
// Teachers use this to watch student progress update
// automatically.
//

export const subscribeToClass = (
  classCode: string,
  callback: (data: Classroom | null) => void
) => {
  const docRef = doc(db, 'classrooms', classCode);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(
          docSnap.data() as Classroom
        );
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(
        'Firestore classroom subscription error:',
        error
      );

      callback(null);
    }
  );
};