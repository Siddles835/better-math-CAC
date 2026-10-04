import { getPlanetLevel } from '@/lib/planetLevels';
import type { PlanetId } from '@/lib/planets';
import type { ExploreBand } from './types';

/** Map the child’s current planet progress to an Explore number band (1–100). */
export const bandFromPlanet = (planetId?: PlanetId | null): ExploreBand => {
  if (!planetId) return 'to10';
  const max = getPlanetLevel(planetId).rangeMax;
  if (max <= 12) return 'to10';
  if (max <= 20) return 'to20';
  return 'to100';
};

export const maxForBand = (band: ExploreBand): number => {
  if (band === 'to10') return 10;
  if (band === 'to20') return 20;
  return 100;
};

export const makeGoalForBand = (band: ExploreBand): 10 | 20 | 100 => {
  if (band === 'to10') return 10;
  if (band === 'to20') return 20;
  return 100;
};
