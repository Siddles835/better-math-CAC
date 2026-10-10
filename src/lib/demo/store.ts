import type { Assignment, Curriculum, LearnerRecord, PilotGoals } from '@/content/types';
import type { Classroom, StudentState } from '@/lib/classroom';
import { DEMO_CLASS_CODE, DEMO_PIN, buildDemoWorld, type DemoWorld } from '@/lib/demo/seed';
import { getLessonForPlanet } from '@/lib/planets';

type Listener = (data: Classroom | null) => void;

let world: DemoWorld = buildDemoWorld();
const listeners = new Set<Listener>();

const emit = () => {
  for (const listener of listeners) listener(world.classroom);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const resetDemoStore = (): void => {
  world = buildDemoWorld();
  emit();
};

export const demoSnapshot = (): DemoWorld => clone(world);

const keyOf = (name: string): string => name.trim().toLowerCase();

export const demoResolveClass = (input: string): string | null => {
  const key = input.trim().toLowerCase();
  if (key === world.classroom.classCode) return world.classroom.classCode;
  return null;
};

export const demoGetClass = (): Classroom => clone(world.classroom);

export const demoSubscribe = (classCode: string, callback: Listener): (() => void) => {
  const wrapped: Listener = (data) => {
    if (classCode.trim().toLowerCase() !== DEMO_CLASS_CODE) callback(null);
    else callback(data);
  };
  listeners.add(wrapped);
  wrapped(clone(world.classroom));
  return () => listeners.delete(wrapped);
};

export const demoVerifyPin = (classCode: string, pin: string) => {
  if (demoResolveClass(classCode) && pin.trim().toUpperCase() === DEMO_PIN) {
    return { ok: true as const, classCode: DEMO_CLASS_CODE, teacherCode: DEMO_PIN };
  }
  return { ok: false as const, reason: 'Teacher PIN is incorrect.' };
};

export const demoRegisterStudent = (nickname: string): { student: StudentState; classCode: string } => {
  const name = nickname.trim().replace(/\s+/g, ' ');
  const key = keyOf(name);
  const student: StudentState = {
    nickname: name,
    planet: world.classroom.defaultStart?.planet ?? 'sun',
    lesson: world.classroom.defaultStart?.lesson ?? 'counting',
    completedPlanets: [],
    planetSteps: {},
    lastUpdated: Date.now(),
  };
  world.classroom = {
    ...world.classroom,
    students: { ...world.classroom.students, [key]: student },
  };
  world.learners = {
    ...world.learners,
    [key]: {
      activePathId: world.classroom.defaultStart?.pathId ?? 'foundations',
      paths: {},
      curriculumProgress: {},
      assessments: [],
      timeByDay: {},
    },
  };
  emit();
  return { student, classCode: DEMO_CLASS_CODE };
};

export const demoPatchStudent = (studentKey: string, fields: Record<string, unknown>): void => {
  const current = world.classroom.students[studentKey];
  if (!current) return;
  const next: StudentState = { ...current, lastUpdated: Date.now() };
  for (const [field, value] of Object.entries(fields)) {
    if (field.startsWith('planetSteps.') && typeof value === 'number') {
      const planet = field.slice('planetSteps.'.length);
      next.planetSteps = { ...next.planetSteps, [planet]: value };
      continue;
    }
    if (value && typeof value === 'object' && '__arrayUnion' in (value as object)) {
      const extra = (value as { __arrayUnion: string[] }).__arrayUnion;
      const set = new Set([...(next.completedPlanets ?? []), ...extra]);
      next.completedPlanets = [...set];
      continue;
    }
    (next as unknown as Record<string, unknown>)[field] = value;
  }
  world.classroom = {
    ...world.classroom,
    students: { ...world.classroom.students, [studentKey]: next },
  };
  emit();
};

export const demoDeleteStudent = (studentKey: string): boolean => {
  if (!world.classroom.students[studentKey]) return false;
  const students = { ...world.classroom.students };
  delete students[studentKey];
  const learners = { ...world.learners };
  delete learners[studentKey];
  world = { ...world, classroom: { ...world.classroom, students }, learners };
  world.assignments = world.assignments.filter(
    (item) => !(item.scope.kind === 'student' && item.scope.studentKey === studentKey)
  );
  emit();
  return true;
};

export const demoDeleteClass = (): boolean => {
  world = {
    classroom: { classCode: DEMO_CLASS_CODE, teacherCode: DEMO_PIN, students: {} },
    learners: {},
    curricula: [],
    assignments: [],
    goals: { whereWeAre: '', whereWeWant: '', updatedAt: Date.now() },
  };
  emit();
  return true;
};

export const demoSetDefaultStart = (planet: string, pathId?: string): void => {
  world.classroom = {
    ...world.classroom,
    defaultStart: {
      planet,
      lesson: getLessonForPlanet(planet),
      pathId: pathId ?? world.classroom.defaultStart?.pathId,
    },
    defaultPlanet: planet,
  };
  emit();
};

export const demoSetPlacement = (enabled: boolean): void => {
  world.classroom = { ...world.classroom, usePlacementCheck: enabled };
  emit();
};

export const demoGetLearner = (studentKey: string): LearnerRecord | null =>
  world.learners[studentKey] ? clone(world.learners[studentKey]) : null;

export const demoSaveLearner = (studentKey: string, record: LearnerRecord): void => {
  world.learners = { ...world.learners, [studentKey]: clone(record) };
};

export const demoListLearners = (): Record<string, LearnerRecord> => clone(world.learners);

export const demoListCurricula = (): Curriculum[] => clone(world.curricula);

export const demoSaveCurriculum = (curriculum: Curriculum): void => {
  const rest = world.curricula.filter((item) => item.id !== curriculum.id);
  world.curricula = [...rest, clone(curriculum)];
};

export const demoDeleteCurriculum = (curriculumId: string): void => {
  world.curricula = world.curricula.filter((item) => item.id !== curriculumId);
  world.assignments = world.assignments.filter((item) => item.curriculumId !== curriculumId);
};

export const demoListAssignments = (): Assignment[] => clone(world.assignments);

export const demoSaveAssignment = (assignment: Assignment): void => {
  const rest = world.assignments.filter((item) => item.id !== assignment.id);
  world.assignments = [...rest, clone(assignment)];
};

export const demoDeleteAssignment = (assignmentId: string): void => {
  world.assignments = world.assignments.filter((item) => item.id !== assignmentId);
};

export const demoGetGoals = (): PilotGoals => clone(world.goals);

export const demoSaveGoals = (goals: PilotGoals): void => {
  world.goals = clone(goals);
};
