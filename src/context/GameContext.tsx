import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { updateStudentState, subscribeToClass, LessonType, StudentState } from '@/lib/classroom';

export type PlanetId = 
  | 'sun' | 'mercury' | 'venus'
  | 'earth' | 'mars' | 'jupiter'
  | 'saturn' | 'uranus' | 'neptune';

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
  completePlanet: (planetId: PlanetId) => Promise<void>;
  getOrderedSequence: () => { planet: PlanetId; lesson: LessonType }[];
  setPosition: (planet: PlanetId, lesson: LessonType) => Promise<void>;
}

const initialProgress: Record<LessonType, LessonProgress> = {
  counting: { completed: false, currentStep: 0 },
  addition: { completed: false, currentStep: 0 },
  subtraction: { completed: false, currentStep: 0 },
};

const initialPlanets: Record<PlanetId, boolean> = {
  sun: false,
  mercury: false,
  venus: false,
  earth: false,
  mars: false,
  jupiter: false,
  saturn: false,
  uranus: false,
  neptune: false,
};

// The strict progression order defined by your curriculum setup
const orderPlanets: PlanetId[] = [
  'sun', 'mercury', 'venus', 
  'earth', 'mars', 'jupiter', 
  'saturn', 'uranus', 'neptune'
];

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLesson, setCurrentLesson] = useState<LessonType | null>(null);
  const [lessonProgress, setLessonProgress] = useState(initialProgress);
  const [showRocketTransition, setShowRocketTransition] = useState(false);
  const [completedPlanets, setCompletedPlanets] = useState(initialPlanets);

  // Helper to grab current login session details from the physical device
  const getActiveStudent = () => {
    try {
      const raw = localStorage.getItem('better-math:active');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // REAL-TIME SYNC LOOP:
  // Listens to the cloud database. If a teacher overrides progress on another device,
  // this active listener intercepts the change and updates the student's iPad view instantly.
  useEffect(() => {
    const active = getActiveStudent();
    if (!active) return;

    const unsubscribe = subscribeToClass(active.classCode, (cls) => {
      if (cls && cls.students && cls.students[active.nickname]) {
        const student: StudentState = cls.students[active.nickname];
        
        setCurrentLesson(student.lesson);
        
        // Compute which planets are completed based on current location
        const targetIndex = orderPlanets.indexOf(student.planet as PlanetId);
        setCompletedPlanets(() => {
          const updated = { ...initialPlanets };
          for (let i = 0; i < targetIndex; i++) {
            if (orderPlanets[i]) {
              updated[orderPlanets[i]] = true;
            }
          }
          return updated;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const updateLessonProgress = (lesson: LessonType, step: number, completed = false) => {
    setLessonProgress(prev => ({
      ...prev,
      [lesson]: { currentStep: step, completed },
    }));
  };

  // Automatically calculates the next planet and its lesson types when completing a step
  const completePlanet = async (planetId: PlanetId) => {
    const active = getActiveStudent();
    if (!active) return;

    // Optimistically check off the planet visually
    setCompletedPlanets(prev => ({ ...prev, [planetId]: true }));

    const currentIndex = orderPlanets.indexOf(planetId);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= orderPlanets.length) {
      nextIndex = orderPlanets.length - 1; // Cap at Neptune
    }
    
    const nextPlanet = orderPlanets[nextIndex];
    
    // Core structural mapping logic
    let nextLesson: LessonType = 'counting';
    if (['earth', 'mars', 'jupiter'].includes(nextPlanet)) {
      nextLesson = 'addition';
    } else if (['saturn', 'uranus', 'neptune'].includes(nextPlanet)) {
      nextLesson = 'subtraction';
    }

    await updateStudentState(active.classCode, {
      nickname: active.nickname,
      planet: nextPlanet,
      lesson: nextLesson,
      lastUpdated: Date.now(),
    });
  };

  const getOrderedSequence = () => {
    const lessons: LessonType[] = ['counting', 'addition', 'subtraction'];
    const seq: { planet: PlanetId; lesson: LessonType }[] = [];
    for (const l of lessons) {
      for (const p of orderPlanets) {
        seq.push({ planet: p, lesson: l });
      }
    }
    return seq;
  };

  const setPosition = async (planet: PlanetId, lesson: LessonType) => {
    setCurrentLesson(lesson);
    const active = getActiveStudent();
    if (!active) return;

    await updateStudentState(active.classCode, {
      nickname: active.nickname,
      planet,
      lesson,
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
        completePlanet,
        getOrderedSequence,
        setPosition,
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
