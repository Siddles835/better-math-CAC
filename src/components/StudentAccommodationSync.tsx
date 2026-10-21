import { useEffect, useRef } from 'react';
import { useAccessibility } from '@/context/AccessibilityContext';
import { findStudentKey, subscribeToClass } from '@/lib/classroom';
import {
  decideStudentAccommodationApply,
  markStudentAccommodationApplied,
} from '@/lib/accommodations/studentAccommodations';
import { getActiveStudent, SESSION_CHANGED } from '@/lib/session';

/**
 * When a student is signed in, adopt that student's teacher-assigned
 * accommodations. Teacher saves on another device arrive through the class
 * subscription. The teacher's own dashboard session is left alone.
 */
const StudentAccommodationSync: React.FC = () => {
  const { replacePrefs } = useAccessibility();
  const replaceRef = useRef(replacePrefs);
  replaceRef.current = replacePrefs;

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const attach = () => {
      unsubscribe?.();
      unsubscribe = null;
      const session = getActiveStudent();
      if (!session || session.solo || !session.classCode || !session.nickname) return;
      unsubscribe = subscribeToClass(session.classCode, (classroom) => {
        if (cancelled || !classroom) return;
        const studentKey = findStudentKey(classroom.students, session.nickname) ?? session.nickname;
        const student = classroom.students?.[studentKey];
        const decision = decideStudentAccommodationApply(
          session.classCode,
          studentKey,
          student?.accommodations
        );
        if (!decision) return;
        markStudentAccommodationApplied(session.classCode, studentKey, decision.appliedUpdatedAt);
        replaceRef.current(decision.prefs);
      });
    };

    attach();
    window.addEventListener(SESSION_CHANGED, attach);
    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener(SESSION_CHANGED, attach);
    };
  }, []);

  return null;
};

export default StudentAccommodationSync;
