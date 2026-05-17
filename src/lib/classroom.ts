import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface Student {
  nickname: string;
  planet: string;
  lesson: string;
}

export interface Classroom {
  classCode: string;
  defaultPlanet: string;
  defaultLesson: string;
  students: Record<string, Student>;
}

// --- API FUNCTIONS ---

export const checkClassExists = async (classCode: string): Promise<boolean> => {
  const docRef = doc(db, 'classrooms', classCode);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
};

export const createClass = async (classCode: string) => {
  const docRef = doc(db, 'classrooms', classCode);
  await setDoc(docRef, {
    classCode,
    defaultPlanet: 'mercury',
    defaultLesson: 'counting',
    students: {}
  });
};

export const getClass = async (classCode: string): Promise<Classroom | null> => {
  const docRef = doc(db, 'classrooms', classCode);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Classroom) : null;
};

export const checkStudentExists = async (classCode: string, nickname: string): Promise<boolean> => {
  const cls = await getClass(classCode);
  return !!(cls && cls.students && cls.students[nickname]);
};

export const registerStudent = async (classCode: string, nickname: string) => {
  const cls = await getClass(classCode);
  if (cls && !cls.students[nickname]) {
    const updatedStudents = {
      ...cls.students,
      [nickname]: {
        nickname,
        planet: cls.defaultPlanet || 'mercury',
        lesson: cls.defaultLesson || 'counting'
      }
    };
    await updateDoc(doc(db, 'classrooms', classCode), { students: updatedStudents });
  }
};

export const updateStudentState = async (classCode: string, student: Student) => {
  const cls = await getClass(classCode);
  if (cls && cls.students[student.nickname]) {
    const updatedStudents = {
      ...cls.students,
      [student.nickname]: student
    };
    await updateDoc(doc(db, 'classrooms', classCode), { students: updatedStudents });
  }
};

export const setClassDefaultStart = async (classCode: string, planet: string, lesson: string) => {
  await updateDoc(doc(db, 'classrooms', classCode), {
    defaultPlanet: planet,
    defaultLesson: lesson
  });
};

// --- REAL-TIME MAGIC ---
// This listens to the database and fires the callback instantly when data changes
export const subscribeToClass = (classCode: string, callback: (data: Classroom | null) => void) => {
  const docRef = doc(db, 'classrooms', classCode);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as Classroom);
    } else {
      callback(null);
    }
  });
};
