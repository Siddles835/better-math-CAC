import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { getClass } from '@/lib/classroom';
import { getActiveStudent } from '@/lib/session';
import type { PlanetId } from '@/lib/planets';

type LessonLocationState = {
  initialStep?: number;
  replay?: boolean;
};

/**
 * Lesson step index persisted to Firebase per planet.
 *
 * The important part here is that Firebase is only written AFTER
 * the lesson has finished loading its saved state.
 */
export function useLessonStep(planetId: PlanetId) {
  const { getPlanetStep, savePlanetStep, planetSteps } = useGame();
  const location = useLocation();

  const navState = location.state as LessonLocationState | null;
  const navStep = navState?.initialStep;
  const isReplay = navState?.replay === true;

  const [step, setStepState] = useState(() => {
    if (isReplay) {
      return 0;
    }

    if (navStep != null && navStep >= 0) {
      return navStep;
    }

    return 0;
  });

  const [ready, setReady] = useState(false);

  const stepRef = useRef(step);
  stepRef.current = step;

  // ------------------------------------------------------------
  // Get saved progress from GameContext
  // ------------------------------------------------------------

  useEffect(() => {
    if (isReplay) {
      return;
    }

    const fromContext = getPlanetStep(planetId);

    if (fromContext > 0 || Object.keys(planetSteps).length > 0) {
      setStepState((prev) => Math.max(prev, fromContext));
    }
  }, [
    planetId,
    getPlanetStep,
    planetSteps,
    isReplay,
  ]);

  // ------------------------------------------------------------
  // Fresh Firebase read when the lesson opens
  // ------------------------------------------------------------

  useEffect(() => {
    if (isReplay) {
      setReady(true);
      return;
    }

    let cancelled = false;

    const active = getActiveStudent();

    if (!active) {
      setReady(true);
      return;
    }

    const loadSavedStep = async () => {
      try {
        const cls = await getClass(active.classCode);

        if (cancelled) {
          return;
        }

        const saved =
          cls?.students?.[active.nickname]?.planetSteps?.[planetId];

        if (saved != null && saved >= 0) {
          setStepState((prev) => Math.max(prev, saved));
        }
      } catch (error) {
        console.error('Failed to load lesson progress:', error);
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    void loadSavedStep();

    return () => {
      cancelled = true;
    };
  }, [planetId, isReplay]);

  // ------------------------------------------------------------
  // Persist step changes
  // ------------------------------------------------------------
  //
  // IMPORTANT:
  // Do not save until Firebase/context hydration has completed.
  //
  // This prevents the initial step=0 from immediately overwriting
  // a student's saved progress.
  // ------------------------------------------------------------

  useEffect(() => {
    if (isReplay || !ready) {
      return;
    }

    void savePlanetStep(planetId, step);
  }, [
    planetId,
    step,
    savePlanetStep,
    isReplay,
    ready,
  ]);

  // ------------------------------------------------------------
  // Change current lesson step
  // ------------------------------------------------------------

  const setStep = useCallback(
    (value: React.SetStateAction<number>) => {
      setStepState(value);
    },
    []
  );

  return [step, setStep, ready] as const;
}