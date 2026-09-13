import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Diagnosis } from './cognition';
import {
  getClassroomUnlockPlanet,
  getFurthestProgressPlanet,
  getLessonForPlanet,
  getPlanetIndex,
  normalizePlanetId,
  planetsBefore,
  type PlanetId,
} from './planets';

export type LessonType = 'counting' | 'addition' | 'subtraction';

export interface LastQuizSummary {
  planet: string;
  lesson: LessonType;
  score: number;
  total: number;
  /** How many attempts each question took (1 = first try). */
  tries: number[];
}

export interface StudentState {
  nickname: string;
  planet: string;
  lesson: LessonType;
  completedPlanets?: string[];
  planetSteps?: Record<string, number>;
  /** Last planet whose lesson the student opened, including replays. */
  lastPlanet?: string;
  lastQuiz?: LastQuizSummary;
  /** Aggregated thinking signal only — drawings and raw taps stay on-device. */
  lastDiagnosis?: Diagnosis;
  lastUpdated: number;
}

export interface Classroom {
  classCode: string;
  teacherCode: string;
  defaultStart?: { planet: string; lesson: LessonType };
  /** Legacy field some older docs may still have */
  defaultPlanet?: string;
  students: Record<string, StudentState>;
}

export const normalizeLabel = (value: string) => value.trim().replace(/\s+/g, ' ');

export const classCodeKey = (classCode: string) => normalizeLabel(classCode).toLowerCase();

export const nicknameKey = (nickname: string) => normalizeLabel(nickname).toLowerCase();

export const findStudentKey = (
  students: Record<string, StudentState> | undefined,
  nickname: string
): string | null => {
  if (!students) return null;
  const key = nicknameKey(nickname);
  if (students[key]) return key;
  const found = Object.keys(students).find((k) => k.toLowerCase() === key);
  return found ?? null;
};

export const resolveClassCode = async (input: string): Promise<string | null> => {
  const exact = normalizeLabel(input);
  if (!exact) return null;

  const exactSnap = await getDoc(doc(db, 'classrooms', exact));
  if (exactSnap.exists()) return exact;

  const key = classCodeKey(exact);
  if (key !== exact) {
    const keySnap = await getDoc(doc(db, 'classrooms', key));
    if (keySnap.exists()) return key;
  }

  return null;
};

const PIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * 6-character PIN. The old Math.random().toString(36).slice(2, 8) version could
 * return fewer than 6 characters (short/empty PIN) when the random float had a
 * short base-36 expansion.
 */
export const generateTeacherPin = () => {
  const bytes =
    typeof crypto !== 'undefined' && 'getRandomValues' in crypto
      ? crypto.getRandomValues(new Uint32Array(6))
      : Array.from({ length: 6 }, () => Math.floor(Math.random() * 0xffffffff));
  return Array.from(bytes, (n) => PIN_ALPHABET[n % PIN_ALPHABET.length]).join('');
};


export const checkClassExists = async (classCode: string): Promise<boolean> => {
  return !!(await resolveClassCode(classCode));
};

export const checkStudentExists = async (classCode: string, nickname: string): Promise<boolean> => {
  const resolved = await resolveClassCode(classCode);
  if (!resolved) return false;
  const cls = await getClassById(resolved);
  return !!findStudentKey(cls?.students, nickname);
};

const getClassById = async (id: string): Promise<Classroom | null> => {
  const docSnap = await getDoc(doc(db, 'classrooms', id));
  return docSnap.exists() ? (docSnap.data() as Classroom) : null;
};

export const createClass = async (
  classCode: string,
  teacherCode?: string
): Promise<{ classCode: string; teacherCode: string }> => {
  const key = classCodeKey(classCode);
  const pin = teacherCode || generateTeacherPin();
  await setDoc(doc(db, 'classrooms', key), {
    classCode: key,
    teacherCode: pin,
    students: {},
  });
  return { classCode: key, teacherCode: pin };
};

export const getClass = async (classCode: string): Promise<Classroom | null> => {
  const resolved = await resolveClassCode(classCode);
  if (!resolved) return null;
  return getClassById(resolved);
};

export const verifyTeacherPin = async (
  classCode: string,
  teacherPin: string
): Promise<{ ok: true; classCode: string; teacherCode: string } | { ok: false; reason: string }> => {
  const resolved = await resolveClassCode(classCode);
  if (!resolved) {
    return { ok: false, reason: `Class code "${normalizeLabel(classCode)}" does not exist.` };
  }
  const cls = await getClassById(resolved);
  if (!cls) {
    return { ok: false, reason: `Class code "${normalizeLabel(classCode)}" does not exist.` };
  }
  const pin = normalizeLabel(teacherPin).toUpperCase();
  if (!cls.teacherCode || cls.teacherCode.toUpperCase() !== pin) {
    return { ok: false, reason: 'Teacher PIN is incorrect.' };
  }
  return { ok: true, classCode: resolved, teacherCode: cls.teacherCode };
};

/** Place a brand-new student at the teacher start / unlock planet. */
export const buildStudentAtClassStart = (
  nickname: string,
  cls: Classroom | null | undefined
): StudentState => {
  const startPlanet: PlanetId = getClassroomUnlockPlanet(cls) ?? 'sun';
  return {
    nickname,
    planet: startPlanet,
    lesson: getLessonForPlanet(startPlanet),
    completedPlanets: planetsBefore(startPlanet),
    planetSteps: {},
    lastUpdated: Date.now(),
  };
};

/**
 * Move a student up to the class start level when they are still behind it.
 * Keeps any existing completed planets / steps; advances planet + lesson for
 * accurate teacher roster and hub unlock.
 */
export const applyClassStartIfNeeded = (
  student: StudentState,
  cls: Classroom | null | undefined
): StudentState => {
  const startPlanet = getClassroomUnlockPlanet(cls);
  if (!startPlanet) return student;

  const progress = getFurthestProgressPlanet(student);
  if (getPlanetIndex(progress) >= getPlanetIndex(startPlanet)) {
    // Still ensure planet/lesson fields match furthest progress for the roster.
    const lesson = getLessonForPlanet(progress);
    if (student.planet === progress && student.lesson === lesson) return student;
    return {
      ...student,
      planet: progress,
      lesson,
      lastUpdated: Date.now(),
    };
  }

  const completed = new Set([
    ...(student.completedPlanets ?? []),
    ...planetsBefore(startPlanet),
  ]);

  return {
    ...student,
    planet: startPlanet,
    lesson: getLessonForPlanet(startPlanet),
    completedPlanets: Array.from(completed),
    lastUpdated: Date.now(),
  };
};

/** Persist class-start bumps for every student still behind the new start. */
export const syncStudentsToClassStart = async (
  classCode: string,
  startPlanet: string
): Promise<number> => {
  const resolved = (await resolveClassCode(classCode)) ?? classCodeKey(classCode);
  const cls = await getClassById(resolved);
  if (!cls?.students) return 0;

  const normalized = normalizePlanetId(startPlanet) ?? 'sun';
  const pretendClass: Classroom = {
    ...cls,
    defaultStart: { planet: normalized, lesson: getLessonForPlanet(normalized) },
    defaultPlanet: normalized,
  };

   // Dotted keys are Firestore field paths, not a students map.
  const payload: Record<string, unknown> = {};

  for (const [key, student] of Object.entries(cls.students)) {
    const next = applyClassStartIfNeeded(student, pretendClass);
    if (
      next.planet !== student.planet ||
      next.lesson !== student.lesson ||
      (next.completedPlanets?.length ?? 0) !== (student.completedPlanets?.length ?? 0)
    ) {
      payload[`students.${key}`] = next;
    }
  }

  const count = Object.keys(payload).length;
  if (count === 0) return 0;

  await updateDoc(doc(db, 'classrooms', resolved), payload);
  return count;
};

export const registerStudent = async (
  classCode: string,
  nickname: string
): Promise<{ student: StudentState; classCode: string } | null> => {
  const resolved = await resolveClassCode(classCode);
  if (!resolved) return null;

  const cls = await getClassById(resolved);
  const displayName = normalizeLabel(nickname);
  const key = nicknameKey(displayName);
  const newStudent = buildStudentAtClassStart(displayName, cls);

  await updateDoc(doc(db, 'classrooms', resolved), {
    [`students.${key}`]: newStudent,
  });
  return { student: newStudent, classCode: resolved };
};

export const updateStudentState = async (
  classCode: string,
  student: StudentState,
  studentKey?: string
) => {
  const resolved = (await resolveClassCode(classCode)) ?? classCodeKey(classCode);
  const key = studentKey || nicknameKey(student.nickname);
  student.lastUpdated = Date.now();
  await updateDoc(doc(db, 'classrooms', resolved), {
    [`students.${key}`]: student,
  });
};

export const setClassDefaultStart = async (classCode: string, planet: string) => {
  const resolved = (await resolveClassCode(classCode)) ?? classCodeKey(classCode);
  const normalized = normalizePlanetId(planet) ?? 'sun';
  const lesson = getLessonForPlanet(normalized);
  await updateDoc(doc(db, 'classrooms', resolved), {
    defaultStart: { planet: normalized, lesson },
    // Keep legacy field in sync for older readers
    defaultPlanet: normalized,
  });
  // Advance roster records so teachers see the correct current planet live.
  await syncStudentsToClassStart(resolved, normalized);
};

/** Permanently remove one student (username + progress + quiz history) from a class. */
export const deleteStudent = async (classCode: string, nicknameOrKey: string): Promise<boolean> => {
  const resolved = await resolveClassCode(classCode);
  if (!resolved) return false;
  const cls = await getClassById(resolved);
  const students = cls?.students;
  const key =
    students && Object.prototype.hasOwnProperty.call(students, nicknameOrKey)
      ? nicknameOrKey
      : findStudentKey(students, nicknameOrKey);
  if (!key) return false;
  await updateDoc(doc(db, 'classrooms', resolved), {
    [`students.${key}`]: deleteField(),
  });
  return true;
};

/** Permanently delete a class, its teacher PIN, roster, and all student progress. */
export const deleteClassroom = async (classCode: string): Promise<boolean> => {
  const resolved = await resolveClassCode(classCode);
  if (!resolved) return false;
  await deleteDoc(doc(db, 'classrooms', resolved));
  return true;
};

export const subscribeToClass = (
  classCode: string,
  callback: (data: Classroom | null) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  let activeUnsub: Unsubscribe | null = null;
  let cancelled = false;

  void resolveClassCode(classCode).then((resolved) => {
    if (cancelled) return;
    const id = resolved ?? classCodeKey(classCode);
    activeUnsub = onSnapshot(
      doc(db, 'classrooms', id),
      (docSnap) => {
        callback(docSnap.exists() ? (docSnap.data() as Classroom) : null);
      },
      (error) => {
        console.error('Class subscription error:', error);
        onError?.(error);
        callback(null);
      }
    );
  });

  return () => {
    cancelled = true;
    activeUnsub?.();
  };
};
