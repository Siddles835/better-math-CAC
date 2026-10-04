import * as React from 'react';
import {
  subscribeToClass,
  applyClassStartIfNeeded,
  findStudentKey,
  nicknameKey,
  patchStudentFields,
  LessonType,
  StudentState,
  LastQuizSummary,
} from '@/lib/classroom';
import type { Diagnosis } from '@/lib/cognition';
import { appendDiagnosisSnapshot, type DiagnosisSnapshot } from '@/lib/cognition/history';
import { createStudentWriter, type ProgressView, type StudentWriter } from '@/lib/studentWrites';
import {
  getActiveStudent,
  SESSION_CHANGED,
  type ActiveStudent,
} from '@/lib/session';
import {
  PlanetId,
  PLANET_ORDER,
  getPlanetIndex,
  buildCompletedMap,
  getClassroomUnlockPlanet,
  normalizePlanetId,
} from '@/lib/planets';
import { hapticMedium } from '@/lib/haptics';
import {
  isSoloClassCode,
  loadSoloProgress,
  patchSoloProgressFields,
  soloProgressToStudent,
} from '@/lib/solo';

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

const mergeHistory = (
  local: DiagnosisSnapshot[],
  remote: DiagnosisSnapshot[] | undefined
): DiagnosisSnapshot[] => {
  const all = [...local, ...(remote ?? [])].sort((a, b) => a.at - b.at);
  const seen = new Set<string>();
  const out: DiagnosisSnapshot[] = [];
  for (const item of all) {
    const key = `${item.at}:${item.planet}:${item.primary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.slice(-40);
};

const GameContext = React.createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLesson, setCurrentLesson] = React.useState<LessonType | null>(null);
  const [planetSteps, setPlanetSteps] = React.useState<Record<string, number>>({});
  const [showRocketTransition, setShowRocketTransition] = React.useState(false);
  const [completedPlanets, setCompletedPlanets] = React.useState<Record<PlanetId, boolean>>(emptyCompleted);
  const [progressPlanetId, setProgressPlanetId] = React.useState<PlanetId>('sun');
  const [classMaxPlanetId, setClassMaxPlanetId] = React.useState<PlanetId>('sun');
  const [lastPlanetId, setLastPlanetId] = React.useState<PlanetId | null>(null);
  const [lastDiagnosis, setLastDiagnosis] = React.useState<Diagnosis | null>(null);
  const [activeSession, setActiveSession] = React.useState<ActiveStudent | null>(() =>
    getActiveStudent()
  );
  const writerRef = React.useRef<StudentWriter | null>(null);
  const writerKeyRef = React.useRef('');
  const visitedLocally = React.useRef(false);
  const historyRef = React.useRef<DiagnosisSnapshot[]>([]);
  const diagnosisRef = React.useRef<Diagnosis | null>(null);
  const quizRef = React.useRef<LastQuizSummary | null>(null);

  const resetLocalProgress = React.useCallback(() => {
    setCurrentLesson(null);
    setPlanetSteps({});
    setCompletedPlanets(emptyCompleted());
    setProgressPlanetId('sun');
    setClassMaxPlanetId('sun');
    setLastPlanetId(null);
    setLastDiagnosis(null);
    setShowRocketTransition(false);
    writerRef.current = null;
    writerKeyRef.current = '';
    visitedLocally.current = false;
    historyRef.current = [];
    diagnosisRef.current = null;
    quizRef.current = null;
  }, []);

  const applyView = React.useCallback((view: ProgressView) => {
    setCurrentLesson(view.lesson);
    setProgressPlanetId(view.planet);
    setLastPlanetId(view.lastPlanet);
    setCompletedPlanets(buildCompletedMap(view.planet, view.completedPlanets));
    setPlanetSteps(view.planetSteps);
  }, []);

  const writerFor = React.useCallback((active: ActiveStudent) => {
    const solo = isSoloClassCode(active.classCode) || active.solo;
    const key = `${solo ? 'solo' : active.classCode}:${nicknameKey(active.nickname)}`;
    if (!writerRef.current || writerKeyRef.current !== key) {
      writerKeyRef.current = key;
      writerRef.current = createStudentWriter({
        write: async (fields) => {
          if (solo) {
            patchSoloProgressFields(fields);
            return;
          }
          await patchStudentFields(active.classCode, nicknameKey(active.nickname), fields);
        },
      });
    }
    return writerRef.current;
  }, []);

  const localWriter = React.useCallback((active: ActiveStudent | null) => {
    if (active) return writerFor(active);
    if (!writerRef.current) {
      writerRef.current = createStudentWriter({ write: async () => {} });
      writerKeyRef.current = 'local';
    }
    return writerRef.current;
  }, [writerFor]);

  React.useEffect(() => {
    const syncSession = () => {
      const next = getActiveStudent();
      setActiveSession((prev) => {
        if (
          prev &&
          next &&
          prev.classCode === next.classCode &&
          prev.nickname === next.nickname
        ) {
          return prev; // same student: don't tear down the live listener
        }
        return next;
      });
      if (!next) resetLocalProgress();
    };
    
    window.addEventListener(SESSION_CHANGED, syncSession);
    return () => window.removeEventListener(SESSION_CHANGED, syncSession);
  }, [resetLocalProgress]);

  const hydrateFromStudent = React.useCallback((student: StudentState) => {
    const active = activeSession ?? getActiveStudent();
    const writer = localWriter(active);
    writer.seed(student, visitedLocally.current);
    historyRef.current = mergeHistory(historyRef.current, student.diagnosisHistory);
    applyView(writer.view());
    if (student.lastDiagnosis) {
      diagnosisRef.current = student.lastDiagnosis;
      setLastDiagnosis(student.lastDiagnosis);
    }
  }, [activeSession, applyView, localWriter]);

  const hydrateClassMax = React.useCallback((maxPlanetId?: string) => {
    const normalized = normalizePlanetId(maxPlanetId);
    // Never regress unlock to Sun when a snapshot omits defaultStart.
    if (!normalized) return;
    setClassMaxPlanetId(normalized);
  }, []);

  const getPlanetStep = React.useCallback(
    (planetId: PlanetId) => planetSteps[planetId] ?? 0,
    [planetSteps]
  );

  const savePlanetStep = React.useCallback(
    async (planetId: PlanetId, step: number) => {
      const active = activeSession ?? getActiveStudent();
      const writer = localWriter(active);
      const pending = writer.savePlanetStep(planetId, step);
      setPlanetSteps(writer.view().planetSteps);
      if (!active) return;
      await pending;
    },
    [activeSession, localWriter]
  );


  const markPlanetVisited = React.useCallback(
    async (planetId: PlanetId) => {
      visitedLocally.current = true;
      const active = activeSession ?? getActiveStudent();
      const writer = localWriter(active);
      const pending = writer.markVisited(planetId);
      const view = writer.view();
      setLastPlanetId(view.lastPlanet);
      setProgressPlanetId(view.planet);
      setCurrentLesson(view.lesson);
      if (!active) return;
      await pending;
    },
    [activeSession, localWriter]
  );

  const saveLastQuiz = React.useCallback(
    async (summary: LastQuizSummary) => {
      quizRef.current = summary;
      const active = activeSession ?? getActiveStudent();
      if (!active) return;
      try {
        const writer = writerFor(active);
        await writer.enqueueFields(() => ({ lastQuiz: quizRef.current }));
      } catch (error) {
        console.error('Could not save quiz', error);
      }
    },
    [activeSession, writerFor]
  );

  const saveDiagnosis = React.useCallback(
    async (diagnosis: Diagnosis) => {
      diagnosisRef.current = diagnosis;
      setLastDiagnosis(diagnosis);
      const active = activeSession ?? getActiveStudent();
      if (!active) return;
      try {
        const writer = writerFor(active);
        const planet = writer.view().lastPlanet;
        historyRef.current = appendDiagnosisSnapshot(historyRef.current, {
          at: diagnosis.updatedAt || Date.now(),
          planet,
          primary: diagnosis.primary,
          confidence: diagnosis.confidence,
        });
        await writer.enqueueFields(() => ({
          lastDiagnosis: diagnosisRef.current,
          diagnosisHistory: historyRef.current,
        }));
      } catch (error) {
        console.error('Could not save diagnosis', error);
      }
    },
    [activeSession, writerFor]
  );

  React.useEffect(() => {
    if (!activeSession) return;

    // Solo learners keep progress on-device — no classroom subscription.
    if (isSoloClassCode(activeSession.classCode) || activeSession.solo) {
      const progress = loadSoloProgress(activeSession.nickname);
      if (progress) {
        hydrateClassMax(progress.unlockPlanet);
        hydrateFromStudent(soloProgressToStudent(progress));
      }
      return;
    }

    let writeInFlight = false;

    const unsubscribe = subscribeToClass(activeSession.classCode, (cls) => {
      if (!cls) return;
      const unlock = getClassroomUnlockPlanet(cls);
      if (unlock) hydrateClassMax(unlock);
      const subKey = findStudentKey(cls.students, activeSession.nickname);
      const student = subKey ? cls.students?.[subKey] : null;
      if (!subKey || !student) return;


      const adjusted = applyClassStartIfNeeded(student, cls);
      hydrateFromStudent(adjusted);

      const writer = writerFor(activeSession);
      const view = writer.view();
      const remotePlanet = normalizePlanetId(student.planet) ?? 'sun';
      const missingComplete = view.completedPlanets.some(
        (id) => !(student.completedPlanets ?? []).includes(id)
      );
      const ahead =
        getPlanetIndex(view.planet) > getPlanetIndex(remotePlanet) || missingComplete;
      if (ahead && !writeInFlight) {
        writeInFlight = true;
        void writer.persistProgress().finally(() => {
          writeInFlight = false;
        });
      }
    });

    return () => unsubscribe();
  }, [activeSession, hydrateFromStudent, hydrateClassMax, writerFor]);

  const completePlanet = async (planetId: PlanetId) => {
    hapticMedium();
    visitedLocally.current = true;
    const active = activeSession ?? getActiveStudent();
    const writer = localWriter(active);
    const pending = writer.completePlanet(planetId);
    const view = writer.view();
    setCompletedPlanets(buildCompletedMap(view.planet, view.completedPlanets));
    setProgressPlanetId(view.planet);
    setLastPlanetId(view.lastPlanet);
    setCurrentLesson(view.lesson);
    if (!active) return;
    await pending;
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

  const setPosition = (_planet: PlanetId, lesson: LessonType) => {
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
  const context = React.useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export type { PlanetId };
