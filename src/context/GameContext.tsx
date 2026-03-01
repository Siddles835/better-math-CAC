import React, { createContext, useContext, useState, ReactNode } from 'react';

export type LessonType = 'counting' | 'addition' | 'subtraction';

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
  completePlanet: (planetId: PlanetId) => void;
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

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLesson, setCurrentLesson] = useState<LessonType | null>(null);
  const [lessonProgress, setLessonProgress] = useState(initialProgress);
  const [showRocketTransition, setShowRocketTransition] = useState(false);
  const [completedPlanets, setCompletedPlanets] = useState(initialPlanets);

  const updateLessonProgress = (lesson: LessonType, step: number, completed = false) => {
    setLessonProgress(prev => ({
      ...prev,
      [lesson]: { currentStep: step, completed },
    }));
  };

  const completePlanet = (planetId: PlanetId) => {
    setCompletedPlanets(prev => ({
      ...prev,
      [planetId]: true,
    }));
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
