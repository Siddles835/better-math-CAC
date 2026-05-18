import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import {
  updateStudentState,
  subscribeToClass,
  getClass,
  LessonType,
  StudentState,
} from '@/lib/classroom';
import {
  PlanetId,
  PLANET_ORDER,
  getLessonForPlanet,
  getPlanetIndex,
  buildCompletedMap,
} from '@/lib/planets';

interface LessonProgress {
  completed: boolean;
  currentStep: number;
}

interface GameContextType {
  currentLesson: LessonType | null;
  setCurrentLesson: (lesson: LessonType | null) => void;
  lessonProgress: Record<LessonType, LessonProgress>;
  updateLessonProgress: (lesson: LessonType, step: number, completed?: boolean) => void;
  showRocketTransition: boolean;
  setShowRocketTransition: (show: boolean) => void;
  completedPlanets: Record<PlanetId, boolean>;
  progressPlanetId: PlanetId;
  classMaxPlanetId: PlanetId;
  completePlanet: (planetId: PlanetId) => Promise<void>;
  getOrderedSequence: () => { planet: PlanetId; lesson: LessonType }[];
  setPosition: (planet: PlanetId, lesson: LessonType) => Promise<void>;
  hydrateFromStudent: (student: StudentState, classMaxPlanetId?: string) => void;
}

const initialProgress: Record<LessonType, LessonProgress> = {
  counting: { completed: false, currentStep: 0 },
  addition: { completed: false, currentStep: 0 },
  subtraction: { completed: false, currentStep: 0 },
};

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
  const [lessonProgress, setLessonProgress] = useState(initialProgress);
  const [showRocketTransition, setShowRocketTransition] = useState(false);
  const [completedPlanets, setCompletedPlanets] = useState<Record<PlanetId, boolean>>(emptyCompleted);
  const [progressPlanetId, setProgressPlanetId] = useState<PlanetId>('sun');
  const [classMaxPlanetId, setClassMaxPlanetId] = useState<PlanetId>('sun');

  const getActiveStudent = () => {
    try {
      const raw = localStorage.getItem('better-math:active');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const hydrateFromStudent = useCallback((student: StudentState, maxPlanetId?: string) => {
    const planet = (PLANET_ORDER.includes(student.planet as PlanetId)
      ? student.planet
      : 'sun') as PlanetId;
    setCurrentLesson(student.lesson);
    setProgressPlanetId(planet);
    setClassMaxPlanetId(
      (maxPlanetId && PLANET_ORDER.includes(maxPlanetId as PlanetId)
        ? maxPlanetId
        : planet) as PlanetId
    );
    setCompletedPlanets(
      buildCompletedMap(planet, student.completedPlanets ?? [])
    );
  }, []);

  useEffect(() => {
    const active = getActiveStudent();
    if (!active) return;

    const unsubscribe = subscribeToClass(active.classCode, (cls) => {
      if (cls?.students?.[active.nickname]) {
        const student = cls.students[active.nickname];
        const maxPlanet = cls.defaultStart?.planet ?? 'sun';
        hydrateFromStudent(student, maxPlanet);
      }
    });

    return () => unsubscribe();
  }, [hydrateFromStudent]);

  const updateLessonProgress = (lesson: LessonType, step: number, completed = false) => {
    setLessonProgress((prev) => ({
      ...prev,
      [lesson]: { currentStep: step, completed },
    }));
  };

  const completePlanet = async (planetId: PlanetId) => {
    const active = getActiveStudent();
    if (!active) return;

    const clsSnap = await getClass(active.classCode);
    const existing = clsSnap?.students?.[active.nickname];
    const completedList = [...(existing?.completedPlanets ?? [])];
    if (!completedList.includes(planetId)) {
      completedList.push(planetId);
    }

    const currentIndex = getPlanetIndex(planetId);
    const maxIndex = getPlanetIndex(clsSnap?.defaultStart?.planet ?? 'sun');
    let nextIndex = Math.min(currentIndex + 1, PLANET_ORDER.length - 1);
    if (nextIndex > maxIndex) {
      nextIndex = maxIndex;
    }

    const nextPlanet = PLANET_ORDER[nextIndex];
    const nextLesson = getLessonForPlanet(nextPlanet);

    setCompletedPlanets((prev) => ({ ...prev, [planetId]: true }));
    setProgressPlanetId(nextPlanet);
    setCurrentLesson(nextLesson);

    await updateStudentState(active.classCode, {
      nickname: active.nickname,
      planet: nextPlanet,
      lesson: nextLesson,
      completedPlanets: completedList,
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

  const setPosition = async (planet: PlanetId, lesson: LessonType) => {
    setCurrentLesson(lesson);
    const active = getActiveStudent();
    if (!active) return;

    const clsSnap = await getClass(active.classCode);
    const existing = clsSnap?.students?.[active.nickname];

    await updateStudentState(active.classCode, {
      nickname: active.nickname,
      planet,
      lesson,
      completedPlanets: existing?.completedPlanets ?? [],
      lastUpdated: Date.now(),
    });
  };

  return (
    <GameContext.Provider
      value={{
        currentLesson,
        setCurrentLesson,
        lessonProgress,
        updateLessonProgress,
        showRocketTransition,
        setShowRocketTransition,
        completedPlanets,
        progressPlanetId,
        classMaxPlanetId,
        completePlanet,
        getOrderedSequence,
        setPosition,
        hydrateFromStudent,
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
