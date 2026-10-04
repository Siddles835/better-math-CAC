import { useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { bandFromPlanet } from '@/lib/explore';
import type { ExploreBand } from '@/lib/explore';

/** Scale Explore numbers from the child’s furthest / unlock planet. */
export const useExploreBand = (): ExploreBand => {
  const { progressPlanetId, classMaxPlanetId } = useGame();
  return useMemo(
    () => bandFromPlanet(progressPlanetId ?? classMaxPlanetId ?? 'sun'),
    [progressPlanetId, classMaxPlanetId]
  );
};

export default useExploreBand;
