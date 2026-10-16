import { PATHS, getPath } from '@/content/catalog';
import type { AssessmentSummary, SkillBand } from '@/content/types';
import { tx } from '@/i18n/tx';
import { ALL_BANDS } from '@/lib/placementBands';
import { PLANET_ORDER, type PlanetId } from '@/lib/planets';

const TOPIC_LABEL_KEY: Record<string, string> = {
  counting: 'ui:topic_counting',
  addition: 'ui:topic_addition',
  subtraction: 'ui:topic_subtraction',
  multiplication: 'ui:topic_multiplication',
  division: 'ui:topic_division',
  algebra: 'ui:topic_algebra',
  geometry: 'paths:path_geometry',
  foundations: 'paths:path_foundations',
  operations: 'paths:path_operations',
};

/** Turn a slug into Title Case words. */
export const humanizeSlug = (raw: string): string =>
  raw
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const translatedOr = (key: string, fallback: string): string => {
  const value = tx(key);
  if (!value || value === key || value.endsWith(key)) return fallback;
  return value;
};

/** Friendly topic name for strengths / practice lists. */
export const labelTopic = (topic: string): string => {
  const key = TOPIC_LABEL_KEY[topic];
  if (key) return translatedOr(key, humanizeSlug(topic));
  return humanizeSlug(topic);
};

const findBand = (bandId: string, bands: SkillBand[] = ALL_BANDS): SkillBand | undefined =>
  bands.find((band) => band.id === bandId) ?? ALL_BANDS.find((band) => band.id === bandId);

/** Friendly label for a cleared skill band (never a raw id). */
export const labelForBandId = (
  bandId: string | null | undefined,
  bands: SkillBand[] = ALL_BANDS
): string => {
  if (!bandId) return tx('paths:resultNotChecked');
  const band = findBand(bandId, bands);
  if (!band) return humanizeSlug(bandId);

  if (band.pathId === 'foundations' && PLANET_ORDER.includes(band.nodeId as PlanetId)) {
    return translatedOr(`ui:pl_label_${band.nodeId}`, humanizeSlug(band.nodeId));
  }

  const path = getPath(band.pathId);
  const node = path?.nodes.find((entry) => entry.id === band.nodeId);
  if (node?.titleKey) return translatedOr(node.titleKey, humanizeSlug(band.nodeId));
  return humanizeSlug(band.nodeId);
};

/** Friendly label for a recommended node on a path. */
export const labelForNodeId = (pathId: string, nodeId: string): string => {
  if (PLANET_ORDER.includes(nodeId as PlanetId)) {
    return translatedOr(`ui:pl_label_${nodeId}`, humanizeSlug(nodeId));
  }
  const path = getPath(pathId);
  const node = path?.nodes.find((entry) => entry.id === nodeId);
  if (node?.titleKey) return translatedOr(node.titleKey, humanizeSlug(nodeId));
  return humanizeSlug(nodeId);
};

export const labelForPathId = (pathId: string): string => {
  const path = getPath(pathId);
  if (path?.titleKey) return translatedOr(path.titleKey, humanizeSlug(pathId));
  return humanizeSlug(pathId);
};

/** How many of the first three checkpoint bands are cleared (for progress dots). */
export const clearedTierForPath = (
  pathId: string,
  clearedBandId: string | null,
  bands: SkillBand[] = ALL_BANDS
): number => {
  if (!clearedBandId) return 0;
  const pathBands = bands
    .filter((band) => band.pathId === pathId)
    .sort((a, b) => a.order - b.order);
  const index = pathBands.findIndex((band) => band.id === clearedBandId);
  if (index < 0) return 0;
  return Math.min(3, index + 1);
};

export interface AssessmentResultView {
  pathTitle: string;
  stepTitle: string;
  strengths: string[];
  practice: string[];
  pathRows: Array<{
    pathId: string;
    pathTitle: string;
    stepTitle: string;
    tiersCleared: number;
    checked: boolean;
  }>;
}

/** Build display-ready copy for the level-check result card. */
export const buildAssessmentResultView = (
  summary: AssessmentSummary,
  bands: SkillBand[] = ALL_BANDS
): AssessmentResultView => {
  const strengths = [...new Set(summary.strengths.map(labelTopic))];
  const practice = [...new Set(summary.practiceTopics.map(labelTopic))];

  const pathOrder = PATHS.map((path) => path.id);
  const pathRows = Object.entries(summary.byPath)
    .map(([pathId, info]) => ({
      pathId,
      pathTitle: labelForPathId(pathId),
      stepTitle: labelForBandId(info.clearedBandId, bands),
      tiersCleared: clearedTierForPath(pathId, info.clearedBandId, bands),
      checked: !!info.clearedBandId,
    }))
    .sort((a, b) => {
      const ai = pathOrder.indexOf(a.pathId);
      const bi = pathOrder.indexOf(b.pathId);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

  return {
    pathTitle: labelForPathId(summary.recommendedPathId),
    stepTitle: labelForNodeId(summary.recommendedPathId, summary.recommendedNodeId),
    strengths,
    practice,
    pathRows,
  };
};
