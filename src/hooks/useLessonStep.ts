import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { findStudentKey, getClass } from '@/lib/classroom';
import { getActiveStudent } from '@/lib/session';
import type { PlanetId } from '@/lib/planets';

type LessonLocationState = { initialStep?: number; replay?: boolean };

/** Dev-only jump used by end-to-end tests. Production builds ignore it. */
function devStep(search: string): number | null {
  if (!import.meta.env.DEV) return null;
  const raw = new URLSearchParams(search).get('mlstep');
  if (raw == null || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

/** Lesson step index persisted to Firebase per planet. */
export function useLessonStep(planetId: PlanetId) {
  const { getPlanetStep, savePlanetStep, planetSteps, markPlanetVisited } = useGame();
  const location = useLocation();
  const navState = location.state as LessonLocationState | null;
  const navStep = navState?.initialStep;
  const isReplay = navState?.replay === true;
  const forced = devStep(location.search ?? '');
  // Furthest saved step is applied once. After the child moves, this step wins.
  const locked = useRef(isReplay || forced != null);
  const [step, setStepState] = useState(() => {
    if (isReplay) return 0;
    if (forced != null) return forced;
    if (navStep != null && navStep >= 0) return navStep;
    return 0;
  });
  const [ready, setReady] = useState(false);
  const stepRef = useRef(step);
  stepRef.current = step;

  // Hydrate the saved furthest step once. Later planetSteps echoes must not
  // pull a child who went back (Practice again, Back) forward again.
  useEffect(() => {
    if (isReplay || locked.current) return;
    const fromContext = getPlanetStep(planetId);
    if (fromContext > 0) {
      locked.current = true;
      setStepState(fromContext);
    }
  }, [planetId, getPlanetStep, planetSteps, isReplay]);

  // Fresh read when the lesson opens (logout / new device / slow listener)
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

    getClass(active.classCode).then((cls) => {
      if (cancelled) return;
      const key = findStudentKey(cls?.students, active.nickname);
      const saved = key ? cls?.students?.[key]?.planetSteps?.[planetId] : undefined;
      if (!locked.current && saved != null && saved > 0) {
        locked.current = true;
        setStepState(saved);
      }

      setReady(true);
    }).catch((err) => {
      // if the user is offline the app still saves it
      console.error('Could not load saved lesson step:', err);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [planetId, isReplay]);

  useEffect(() => {
    void markPlanetVisited(planetId);
  }, [planetId, markPlanetVisited]);

  // Persist when leaving the lesson (home, logout, back to planet ring)
  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    return () => {
      // Only persist once the saved step has been read back, otherwise a quick
      // exit would write step 0 over real progress.
      if (readyRef.current) void savePlanetStep(planetId, stepRef.current);
    };
  }, [planetId, savePlanetStep]);


  const setStep = useCallback(
    (value: React.SetStateAction<number>) => {
      locked.current = true;
      const next = typeof value === 'function' ? value(stepRef.current) : value;
      stepRef.current = next;
      setStepState(next);
      void savePlanetStep(planetId, next);
    },
    [planetId, savePlanetStep]
  );

  return [step, setStep, ready] as const;
}
