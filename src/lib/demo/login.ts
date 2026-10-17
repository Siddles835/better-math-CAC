import { DEMO_CLASS_CODE, DEMO_PIN, DEMO_STUDENT_NICKNAME } from '@/lib/demo/seed';
import { enableDemo } from '@/lib/demo/mode';
import { demoGetClass, resetDemoStore } from '@/lib/demo/store';
import { seedDemoObjectPrefs } from '@/lib/demo/objects';
import { setActiveStudent, setActiveTeacher } from '@/lib/session';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';

/** Ensure demo store + object starter prefs are ready, then sign in as teacher. */
export const enterDemoAsTeacher = (): string => {
  enableDemo();
  resetDemoStore();
  seedDemoObjectPrefs();
  setActiveTeacher({ classCode: DEMO_CLASS_CODE, teacherCode: DEMO_PIN });
  return `/teacher/${DEMO_CLASS_CODE}`;
};

/** Ensure demo store + object starter prefs are ready, then sign in as a seeded student. */
export const enterDemoAsStudent = (): string => {
  enableDemo();
  resetDemoStore();
  seedDemoObjectPrefs();
  const classroom = demoGetClass();
  const key = DEMO_STUDENT_NICKNAME.trim().toLowerCase();
  const student = classroom.students[key];
  setActiveStudent({
    classCode: DEMO_CLASS_CODE,
    nickname: key,
    displayName: student?.nickname ?? DEMO_STUDENT_NICKNAME,
  });
  return STUDENT_HUB_PATH;
};
