import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import {
  updateStudentState,
  subscribeToClass,
  getClass,
  applyClassStartIfNeeded,
  LessonType,
  StudentState,
  LastQuizSummary,
} from '@/lib/classroom';
import type { Diagnosis } from '@/lib/cognition';
import {
  getActiveStudent,
  SESSION_CHANGED,
  type ActiveStudent,
} from '@/lib/session';
import {
  PlanetId,
  PLANET_ORDER,
  getLessonForPlanet,
  getPlanetIndex,
  buildCompletedMap,
  getFurthestProgressPlanet,
  getClassroomUnlockPlanet,
  normalizePlanetId,
} from '@/lib/planets';
import { hapticMedium } from '@/lib/haptics';

interface GameContextType {
  currentLesson: LessonType | null;
  setCurrentLesson: (lesson: LessonType | null) => void;
  planetSteps: Record<string, number>;
  getPlanetStep: (planetId: PlanetId) => number;
  savePlanetStep: (planetId: PlanetId, step: number) => Promise<void>;
  showRocketTransition: boolean;
  setShowRocketTransition: (show: boolean) => void;
  completedPlanets: Record<PlanetId, boolean>;
  progressPlanetId: PlanetId;
  classMaxPlanetId: PlanetId;
  lastPlanetId: PlanetId | null;
  completePlanet: (planetId: PlanetId) => Promise<void>;
  getOrderedSequence: () => { planet: PlanetId; lesson: LessonType }[];
  setPosition: (planet: PlanetId, lesson: LessonType) => void;
  markPlanetVisited: (planetId: PlanetId) => Promise<void>;
  saveLastQuiz: (summary: LastQuizSummary) => Promise<void>;
  lastDiagnosis: Diagnosis | null;
  saveDiagnosis: (diagnosis: Diagnosis) => Promise<void>;
  hydrateFromStudent: (student: StudentState) => void;
  hydrateClassMax: (classMaxPlanetId?: string) => void;
}

const emptyCompleted = (): Record<PlanetId, boolean> =>
  PLANET_ORDER.reduce(
    (acc, id) => {
      acc[id] = false;
      return acc;
    },
    {} as Record<PlanetId, boolean>
  );

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLesson, setCurrentLesson] = useState<LessonType | null>(null);
  const [planetSteps, setPlanetSteps] = useState<Record<string, number>>({});
  const [showRocketTransition, setShowRocketTransition] = useState(false);
  const [completedPlanets, setCompletedPlanets] = useState<Record<PlanetId, boolean>>(emptyCompleted);
  const [progressPlanetId, setProgressPlanetId] = useState<PlanetId>('sun');
  const [classMaxPlanetId, setClassMaxPlanetId] = useState<PlanetId>('sun');
  const [lastPlanetId, setLastPlanetId] = useState<PlanetId | null>(null);
  const [lastDiagnosis, setLastDiagnosis] = useState<Diagnosis | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveStudent | null>(() =>
    getActiveStudent()
  );

  const resetLocalProgress = useCallback(() => {
    setCurrentLesson(null);
    setPlanetSteps({});
    setCompletedPlanets(emptyCompleted());
    setProgressPlanetId('sun');
    setClassMaxPlanetId('sun');
    setLastPlanetId(null);
    setLastDiagnosis(null);
    setShowRocketTransition(false);
  }, []);

  useEffect(() => {
    const syncSession = () => {
      const next = getActiveStudent();
      setActiveSession(next);
      if (!next) resetLocalProgress();
    };
    window.addEventListener(SESSION_CHANGED, syncSession);
    return () => window.removeEventListener(SESSION_CHANGED, syncSession);
  }, [resetLocalProgress]);

  const hydrateFromStudent = useCallback((student: StudentState) => {
    const progressPlanet = getFurthestProgressPlanet(student);
    setCurrentLesson(student.lesson);
    setProgressPlanetId(progressPlanet);
    setLastPlanetId((prev) => normalizePlanetId(student.lastPlanet) ?? prev);
    setCompletedPlanets(
      buildCompletedMap(progressPlanet, student.completedPlanets ?? [])
    );
    setPlanetSteps(student.planetSteps ?? {});
    if (student.lastDiagnosis) setLastDiagnosis(student.lastDiagnosis);
  }, []);

  const hydrateClassMax = useCallback((maxPlanetId?: string) => {
    const normalized = normalizePlanetId(maxPlanetId);
    // Never regress unlock to Sun when a snapshot omits defaultStart.
    if (!normalized) return;
    setClassMaxPlanetId(normalized);
  }, []);

  const getPlanetStep = useCallback(
    (planetId: PlanetId) => planetSteps[planetId] ?? 0,
    [planetSteps]
  );

  const savePlanetStep = useCallback(
    async (planetId: PlanetId, step: number) => {
      setPlanetSteps((prev) => ({ ...prev, [planetId]: step }));

      const active = activeSession ?? getActiveStudent();
      if (!active) return;

      const clsSnap = await getClass(active.classCode);
      const existing = clsSnap?.students?.[active.nickname];
      if (!existing) return;

      await updateStudentState(
        active.classCode,
        {
          ...existing,
          planetSteps: { ...(existing.planetSteps ?? {}), [planetId]: step },
          lastUpdated: Date.now(),
        },
        active.nickname
      );
    },
    [activeSession]
  );

  const markPlanetVisited = useCallback(
    async (planetId: PlanetId) => {
      setLastPlanetId(planetId);
      setProgressPlanetId((prev) =>
        getPlanetIndex(planetId) >= getPlanetIndex(prev) ? planetId : prev
      );
      setCurrentLesson(getLessonForPlanet(planetId));

      const active = activeSession ?? getActiveStudent();
      if (!active) return;

      const clsSnap = await getClass(active.classCode);
      const existing = clsSnap?.students?.[active.nickname];
      if (!existing) return;

      const current = getFurthestProgressPlanet(existing);
      const nextPlanet =
        getPlanetIndex(planetId) >= getPlanetIndex(current) ? planetId : current;

      await updateStudentState(
        active.classCode,
        {
          ...existing,
          planet: nextPlanet,
          lesson: getLessonForPlanet(nextPlanet),
          lastPlanet: planetId,
          lastUpdated: Date.now(),
        },
        active.nickname
      );
    },
    [activeSession]
  );

  const saveLastQuiz = useCallback(
    async (summary: LastQuizSummary) => {
      const active = activeSession ?? getActiveStudent();
      if (!active) return;

      const clsSnap = await getClass(active.classCode);
      const existing = clsSnap?.students?.[active.nickname];
      if (!existing) return;

      await updateStudentState(
        active.classCode,
        {
          ...existing,
          lastQuiz: summary,
          lastUpdated: Date.now(),
        },
        active.nickname
      );
    },
    [activeSession]
  );

  const saveDiagnosis = useCallback(
    async (diagnosis: Diagnosis) => {
      setLastDiagnosis(diagnosis);
      const active = activeSession ?? getActiveStudent();
      if (!active) return;
      const clsSnap = await getClass(active.classCode);
      const existing = clsSnap?.students?.[active.nickname];
      if (!existing) return;
      await updateStudentState(
        active.classCode,
        {
          ...existing,
          lastDiagnosis: diagnosis,
          lastUpdated: Date.now(),
        },
        active.nickname
      );
    },
    [activeSession]
  );

  useEffect(() => {
    if (!activeSession) return;
    let writeInFlight = false;

    const unsubscribe = subscribeToClass(activeSession.classCode, (cls) => {
      if (!cls) return;
      const unlock = getClassroomUnlockPlanet(cls);
      if (unlock) hydrateClassMax(unlock);
      const student = cls.students?.[activeSession.nickname];
      if (!student) return;

      const adjusted = applyClassStartIfNeeded(student, cls);
      hydrateFromStudent(adjusted);

      const needsWrite =
        adjusted.planet !== student.planet ||
        adjusted.lesson !== student.lesson ||
        (adjusted.completedPlanets?.length ?? 0) !== (student.completedPlanets?.length ?? 0);

      if (needsWrite && !writeInFlight) {
        writeInFlight = true;
        void updateStudentState(activeSession.classCode, adjusted, activeSession.nickname).finally(
          () => {
            writeInFlight = false;
          }
        );
      }
    });

    return () => unsubscribe();
  }, [activeSession, hydrateFromStudent, hydrateClassMax]);

  const completePlanet = async (planetId: PlanetId) => {
    hapticMedium();
    const active = activeSession ?? getActiveStudent();
    if (!active) return;

    const clsSnap = await getClass(active.classCode);
    const existing = clsSnap?.students?.[active.nickname];
    const completedList = [...(existing?.completedPlanets ?? [])];
    if (!completedList.includes(planetId)) {
      completedList.push(planetId);
    }

    const currentIndex = getPlanetIndex(planetId);
    const nextIndex = Math.min(currentIndex + 1, PLANET_ORDER.length - 1);
    const nextPlanet = PLANET_ORDER[nextIndex];
    const nextLesson = getLessonForPlanet(nextPlanet);

    setCompletedPlanets((prev) => ({ ...prev, [planetId]: true }));
    setProgressPlanetId(nextPlanet);
    setLastPlanetId(nextPlanet);
    setCurrentLesson(nextLesson);

    if (!existing) return;

    await updateStudentState(
      active.classCode,
      {
        ...existing,
        planet: nextPlanet,
        lesson: nextLesson,
        lastPlanet: nextPlanet,
        completedPlanets: completedList,
        planetSteps: { ...(existing.planetSteps ?? {}) },
        lastUpdated: Date.now(),
      },
      active.nickname
    );
  };

  const getOrderedSequence = () => {
    const lessons: LessonType[] = ['counting', 'addition', 'subtraction'];
    const seq: { planet: PlanetId; lesson: LessonType }[] = [];
    for (const l of lessons) {
      for (const p of PLANET_ORDER) {
        seq.push({ planet: p, lesson: l });
      }
    }
    return seq;
  };

  const setPosition = (planet: PlanetId, lesson: LessonType) => {
    setCurrentLesson(lesson);
    // Do not write planet to Firebase here — that regressed progress when replaying.
  };

  return (
    <GameContext.Provider
      value={{
        currentLesson,
        setCurrentLesson,
        planetSteps,
        getPlanetStep,
        savePlanetStep,
        showRocketTransition,
        setShowRocketTransition,
        completedPlanets,
        progressPlanetId,
        classMaxPlanetId,
        lastPlanetId,
        completePlanet,
        getOrderedSequence,
        setPosition,
        markPlanetVisited,
        saveLastQuiz,
        lastDiagnosis,
        saveDiagnosis,
        hydrateFromStudent,
        hydrateClassMax,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export type { PlanetId };
