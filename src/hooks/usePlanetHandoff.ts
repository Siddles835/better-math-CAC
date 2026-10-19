import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useAccessibility } from '@/context/AccessibilityContext';
import { ROCKET_NAVIGATE_MS, ROCKET_REDUCED_MS } from '@/components/RocketTransition';
import type { PlanetId } from '@/lib/planets';

/**
 * Unlock the next planet locally before navigation. A second click is ignored
 * so two completions cannot race.
 */
export function usePlanetHandoff() {
  const busy = useRef(false);
  const navigate = useNavigate();
  const { completePlanet, startRocketTransition } = useGame();
  const { prefs } = useAccessibility();
  const reduceMotion = prefs.reduceMotion || prefs.calmBackground;

  const leave = (planetId: PlanetId, nextPath: string, state?: unknown) => {
    if (busy.current) return;
    busy.current = true;
    void completePlanet(planetId);
    startRocketTransition();
    const delayMs = reduceMotion ? Math.min(ROCKET_REDUCED_MS, 200) : ROCKET_NAVIGATE_MS;
    window.setTimeout(() => {
      navigate(nextPath, state === undefined ? undefined : { state });
    }, delayMs);
  };

  const finish = (planetId: PlanetId, nextPath = '/planets') => {
    if (busy.current) return;
    busy.current = true;
    void completePlanet(planetId);
    navigate(nextPath);
  };

  return { leave, finish };
}
