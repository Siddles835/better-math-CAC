import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { getClass } from '@/lib/classroom';
import { getActiveStudent } from '@/lib/session';
import type { PlanetId } from '@/lib/planets';

type LessonLocationState = { initialStep?: number };

/** Lesson step index persisted to Firebase per planet. */
export function useLessonStep(planetId: PlanetId) {
  const { getPlanetStep, savePlanetStep, planetSteps } = useGame();
  const location = useLocation();
  const navStep = (location.state as LessonLocationState | null)?.initialStep;
  const [step, setStepState] = useState(() => {
    if (navStep != null && navStep >= 0) return navStep;
    return 0;
  });
  const [ready, setReady] = useState(false);
  const stepRef = useRef(step);
  stepRef.current = step;

  // Apply saved steps from context once Firebase hydration lands
  useEffect(() => {
    const fromContext = getPlanetStep(planetId);
    if (fromContext > 0 || Object.keys(planetSteps).length > 0) {
      setStepState((prev) => Math.max(prev, fromContext));
    }
  }, [planetId, getPlanetStep, planetSteps]);

  // Fresh read when the lesson opens (logout / new device / slow listener)
  useEffect(() => {
    let cancelled = false;
    const active = getActiveStudent();
    if (!active) {
      setReady(true);
      return;
    }

    getClass(active.classCode).then((cls) => {
      if (cancelled) return;
      const saved = cls?.students?.[active.nickname]?.planetSteps?.[planetId];
      if (saved != null && saved >= 0) {
        setStepState((prev) => Math.max(prev, saved));
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [planetId]);

  // Persist when leaving the lesson (home, logout, back to planet ring)
  useEffect(() => {
    return () => {
      void savePlanetStep(planetId, stepRef.current);
    };
  }, [planetId, savePlanetStep]);

  const setStep = useCallback(
    (value: React.SetStateAction<number>) => {
      setStepState((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        void savePlanetStep(planetId, next);
        return next;
      });
    },
    [planetId, savePlanetStep]
  );

  return [step, setStep, ready] as const;
}
