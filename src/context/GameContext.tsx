import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import {
  updateStudentState,
  subscribeToClass,
  getClass,
  LessonType,
  StudentState,
} from '@/lib/classroom';
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
} from '@/lib/planets';

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
  completePlanet: (planetId: PlanetId) => Promise<void>;
  getOrderedSequence: () => { planet: PlanetId; lesson: LessonType }[];
  setPosition: (planet: PlanetId, lesson: LessonType) => void;
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
  const [activeSession, setActiveSession] = useState<ActiveStudent | null>(() =>
    getActiveStudent()
  );

  useEffect(() => {
    const syncSession = () => setActiveSession(getActiveStudent());
    window.addEventListener(SESSION_CHANGED, syncSession);
    return () => window.removeEventListener(SESSION_CHANGED, syncSession);
  }, []);

  const hydrateFromStudent = useCallback((student: StudentState) => {
    const progressPlanet = getFurthestProgressPlanet(student);
    setCurrentLesson(student.lesson);
    setProgressPlanetId(progressPlanet);
    setCompletedPlanets(
      buildCompletedMap(progressPlanet, student.completedPlanets ?? [])
    );
    setPlanetSteps(student.planetSteps ?? {});
  }, []);

  const hydrateClassMax = useCallback((maxPlanetId?: string) => {
    setClassMaxPlanetId(
      (maxPlanetId && PLANET_ORDER.includes(maxPlanetId as PlanetId)
        ? maxPlanetId
        : 'sun') as PlanetId
    );
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

      await updateStudentState(active.classCode, {
        ...existing,
        planetSteps: { ...(existing.planetSteps ?? {}), [planetId]: step },
        lastUpdated: Date.now(),
      });
    },
    [activeSession]
  );

  useEffect(() => {
    if (!activeSession) return;

    const unsubscribe = subscribeToClass(activeSession.classCode, (cls) => {
      if (!cls) return;
      hydrateClassMax(cls.defaultStart?.planet);
      const student = cls.students?.[activeSession.nickname];
      if (student) hydrateFromStudent(student);
    });

    return () => unsubscribe();
  }, [activeSession, hydrateFromStudent, hydrateClassMax]);

  const completePlanet = async (planetId: PlanetId) => {
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
    setCurrentLesson(nextLesson);

    if (!existing) return;

    await updateStudentState(active.classCode, {
      ...existing,
      planet: nextPlanet,
      lesson: nextLesson,
      completedPlanets: completedList,
      planetSteps: { ...(existing.planetSteps ?? {}) },
      lastUpdated: Date.now(),
    });
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
        completePlanet,
        getOrderedSequence,
        setPosition,
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
