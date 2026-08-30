export type Point = { x: number; y: number };
export type Stroke = Point[];

const GRID = 16;
const INNER = 12;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Crop strokes to their bounding box, scale into 12×12, pad to 16×16. */
export const rasterizeStrokes = (strokes: Stroke[]): number[] => {
  const grid = new Float32Array(GRID * GRID);
  const pts = strokes.flat();
  if (pts.length === 0) return Array.from(grid);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const scale = INNER / Math.max(w, h);
  const padX = (GRID - w * scale) / 2;
  const padY = (GRID - h * scale) / 2;

  const paint = (x: number, y: number) => {
    const gx = clamp(Math.round(x), 0, GRID - 1);
    const gy = clamp(Math.round(y), 0, GRID - 1);
    grid[gy * GRID + gx] = 1;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = gx + dx;
      const ny = gy + dy;
      if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) {
        grid[ny * GRID + nx] = Math.max(grid[ny * GRID + nx], 0.55);
      }
    }
  };

  for (const stroke of strokes) {
    for (let i = 0; i < stroke.length; i++) {
      const x = (stroke[i].x - minX) * scale + padX;
      const y = (stroke[i].y - minY) * scale + padY;
      paint(x, y);
      if (i === 0) continue;
      const px = (stroke[i - 1].x - minX) * scale + padX;
      const py = (stroke[i - 1].y - minY) * scale + padY;
      const steps = Math.max(1, Math.hypot(x - px, y - py) * 2);
      for (let s = 1; s <= steps; s++) {
        paint(px + ((x - px) * s) / steps, py + ((y - py) * s) / steps);
      }
    }
  }

  return Array.from(grid);
};

export const startQuadrant = (strokes: Stroke[]): number => {
  const first = strokes[0]?.[0];
  if (!first) return 0;
  const pts = strokes.flat();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const left = first.x < midX;
  const top = first.y < midY;
  if (top && left) return 0;
  if (top && !left) return 1;
  if (!top && left) return 2;
  return 3;
};
