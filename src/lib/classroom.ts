export type LessonType = 'counting' | 'addition' | 'subtraction';

export interface StudentState {
  nickname: string;
  planet: string; // e.g. mercury
  lesson: LessonType;
  lastUpdated: number;
}

export interface Classroom {
  classCode: string;
  teacherCode: string;
  defaultStart?: { planet: string; lesson: LessonType };
  students: Record<string, StudentState>; // key: nickname
}

const CLASS_PREFIX = 'better-math:class:';

export const createOrGetClass = (classCode: string, teacherCode?: string): Classroom => {
  const key = CLASS_PREFIX + classCode;
  const raw = localStorage.getItem(key);
  if (raw) return JSON.parse(raw) as Classroom;
  const cls: Classroom = {
    classCode,
    teacherCode: teacherCode || Math.random().toString(36).slice(2, 8),
    students: {},
  };
  localStorage.setItem(key, JSON.stringify(cls));
  return cls;
};

export const saveClass = (cls: Classroom) => {
  const key = CLASS_PREFIX + cls.classCode;
  localStorage.setItem(key, JSON.stringify(cls));
  // trigger storage event in same tab for simplicity
  window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(cls) }));
};

export const joinAsStudent = (classCode: string, nickname: string): StudentState => {
  const cls = createOrGetClass(classCode);
  const existing = cls.students[nickname];
  if (existing) return existing;
  const start = cls.defaultStart || { planet: 'mercury', lesson: 'counting' as LessonType };
  const student: StudentState = {
    nickname,
    planet: start.planet,
    lesson: start.lesson,
    lastUpdated: Date.now(),
  };
  cls.students[nickname] = student;
  saveClass(cls);
  return student;
};

export const updateStudentState = (classCode: string, student: StudentState) => {
  const key = CLASS_PREFIX + classCode;
  const cls = createOrGetClass(classCode);
  student.lastUpdated = Date.now();
  cls.students[student.nickname] = student;
  saveClass(cls);
};

export const getClass = (classCode: string): Classroom | null => {
  const key = CLASS_PREFIX + classCode;
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as Classroom) : null;
};

export const setClassDefaultStart = (classCode: string, planet: string, lesson: LessonType) => {
  const cls = createOrGetClass(classCode);
  cls.defaultStart = { planet, lesson };
  saveClass(cls);
};
