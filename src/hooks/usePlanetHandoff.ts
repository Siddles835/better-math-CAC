import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import type { PlanetId } from '@/lib/planets';

/**
 * Unlock the next planet locally before navigation. A second click is ignored
 * so two completions cannot race.
 */
export function usePlanetHandoff() {
  const busy = useRef(false);
  const navigate = useNavigate();
  const { completePlanet, setShowRocketTransition } = useGame();

  const leave = (planetId: PlanetId, nextPath: string, state?: unknown) => {
    if (busy.current) return;
    busy.current = true;
    void completePlanet(planetId);
    setShowRocketTransition(true);
    window.setTimeout(() => {
      navigate(nextPath, state === undefined ? undefined : { state });
      setShowRocketTransition(false);
    }, 1600);
  };

  const finish = (planetId: PlanetId, nextPath = '/planets') => {
    if (busy.current) return;
    busy.current = true;
    void completePlanet(planetId);
    navigate(nextPath);
  };

  return { leave, finish };
}
