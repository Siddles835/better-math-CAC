export type Point = { x: number; y: number };
export type Stroke = Point[];

/** MNIST-style grid used by the on-device digit model. */
export const GRID = 28;
const INNER = 20;
const THICKNESS = 3.0;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const distToSegment = (px: number, py: number, x0: number, y0: number, x1: number, y1: number): number => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) return Math.hypot(px - x0, py - y0);
  let t = ((px - x0) * dx + (py - y0) * dy) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
};

const paintSegment = (
  grid: Float32Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number
) => {
  const pad = thickness + 1.5;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1) - pad));
  const maxX = Math.min(GRID - 1, Math.ceil(Math.max(x0, x1) + pad));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1) - pad));
  const maxY = Math.min(GRID - 1, Math.ceil(Math.max(y0, y1) + pad));
  const half = thickness / 2;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dist = distToSegment(x + 0.5, y + 0.5, x0, y0, x1, y1);
      const ink = clamp(half + 0.55 - dist, 0, 1);
      if (ink <= 0) continue;
      const idx = y * GRID + x;
      grid[idx] = Math.max(grid[idx], ink);
    }
  }
};

/**
 * MNIST-style raster: thick anti-aliased strokes, crop to bbox, scale into 20×20
 * keeping aspect ratio, then center by center of mass in 28×28. Values in [0, 1].
 */
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
  const scale = (INNER - 1) / Math.max(w, h);
  const scaledW = w * scale;
  const scaledH = h * scale;
  const padX = (INNER - scaledW) / 2;
  const padY = (INNER - scaledH) / 2;
  // Place the 20×20 block in the center of 28×28 before CoM centering.
  const originX = (GRID - INNER) / 2 + padX;
  const originY = (GRID - INNER) / 2 + padY;

  const mapX = (x: number) => (x - minX) * scale + originX;
  const mapY = (y: number) => (y - minY) * scale + originY;

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      const x = mapX(stroke[0].x);
      const y = mapY(stroke[0].y);
      paintSegment(grid, x, y, x + 0.01, y + 0.01, THICKNESS);
      continue;
    }
    for (let i = 1; i < stroke.length; i++) {
      paintSegment(
        grid,
        mapX(stroke[i - 1].x),
        mapY(stroke[i - 1].y),
        mapX(stroke[i].x),
        mapY(stroke[i].y),
        THICKNESS
      );
    }
  }

  let mass = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const v = grid[y * GRID + x];
      if (v <= 0) continue;
      mass += v;
      sumX += v * (x + 0.5);
      sumY += v * (y + 0.5);
    }
  }
  if (mass < 1e-6) return Array.from(grid);

  const cx = sumX / mass;
  const cy = sumY / mass;
  const shiftX = Math.round(GRID / 2 - cx);
  const shiftY = Math.round(GRID / 2 - cy);
  if (shiftX === 0 && shiftY === 0) return Array.from(grid);

  const shifted = new Float32Array(GRID * GRID);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const sx = x - shiftX;
      const sy = y - shiftY;
      if (sx < 0 || sy < 0 || sx >= GRID || sy >= GRID) continue;
      shifted[y * GRID + x] = grid[sy * GRID + sx];
    }
  }
  return Array.from(shifted);
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
