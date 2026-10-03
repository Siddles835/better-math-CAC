import type { Stroke } from './strokes';

export interface DigitGroup {
  strokes: Stroke[];
  minX: number;
  maxX: number;
}

/**
 * Cluster strokes into at most two left-to-right digits.
 * Strokes that overlap in x (a 4 or a 5 drawn in pieces) stay in one digit.
 * More than two separated groups is too many parts.
 */
export const segmentIntoDigits = (
  strokes: Stroke[]
): { groups: DigitGroup[]; tooMany: boolean } => {
  const items = strokes
    .filter((stroke) => stroke.length >= 2)
    .map((stroke) => {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const point of stroke) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
      return { stroke, minX, maxX, minY, maxY, height: Math.max(1, maxY - minY) };
    })
    .sort((a, b) => a.minX - b.minX || a.minY - b.minY);

  if (items.length === 0) return { groups: [], tooMany: false };

  const heights = items.map((item) => item.height).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] ?? 1;
  const gapThreshold = Math.max(18, medianHeight * 0.45);

  const clustered: (typeof items)[] = [[items[0]]];
  for (let i = 1; i < items.length; i++) {
    const current = clustered[clustered.length - 1];
    const prevMax = Math.max(...current.map((item) => item.maxX));
    if (items[i].minX - prevMax > gapThreshold) clustered.push([items[i]]);
    else current.push(items[i]);
  }

  return {
    groups: clustered.map((group) => ({
      strokes: group.map((item) => item.stroke),
      minX: Math.min(...group.map((item) => item.minX)),
      maxX: Math.max(...group.map((item) => item.maxX)),
    })),
    tooMany: clustered.length > 2,
  };
};

export const strokePointCount = (strokes: Stroke[]): number =>
  strokes.reduce((sum, stroke) => sum + stroke.length, 0);

export const strokeSpan = (strokes: Stroke[]): number => {
  const points = strokes.flat();
  if (points.length === 0) return 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return Math.max(maxX - minX, maxY - minY);
};
