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

const DB_KEY = 'better_math_db';

// Helper to get all data
const getDB = (): Record<string, Classroom> => {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) || '{}');
  } catch {
    return {};
  }
};

// Helper to save data and trigger real-time updates across the app
const saveDB = (db: Record<string, Classroom>) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  window.dispatchEvent(new Event('storage')); // Notifies TeacherDashboard of changes
};

// --- API FUNCTIONS ---

export const checkClassExists = (classCode: string): boolean => {
  return !!getDB()[classCode];
};

export const createClass = (classCode: string) => {
  const db = getDB();
  db[classCode] = {
    classCode,
    defaultPlanet: 'mercury',
    defaultLesson: 'counting',
    students: {}
  };
  saveDB(db);
};

export const getClass = (classCode: string): Classroom | null => {
  return getDB()[classCode] || null;
};

export const checkStudentExists = (classCode: string, nickname: string): boolean => {
  const db = getDB();
  return !!(db[classCode] && db[classCode].students[nickname]);
};

export const registerStudent = (classCode: string, nickname: string) => {
  const db = getDB();
  if (db[classCode] && !db[classCode].students[nickname]) {
    db[classCode].students[nickname] = {
      nickname,
      planet: db[classCode].defaultPlanet || 'mercury',
      lesson: db[classCode].defaultLesson || 'counting'
    };
    saveDB(db);
  }
};

export const updateStudentState = (classCode: string, student: Student) => {
  const db = getDB();
  if (db[classCode] && db[classCode].students[student.nickname]) {
    db[classCode].students[student.nickname] = student;
    saveDB(db);
  }
};

export const setClassDefaultStart = (classCode: string, planet: string, lesson: string) => {
  const db = getDB();
  if (db[classCode]) {
    db[classCode].defaultPlanet = planet;
    db[classCode].defaultLesson = lesson;
    saveDB(db);
  }
};
