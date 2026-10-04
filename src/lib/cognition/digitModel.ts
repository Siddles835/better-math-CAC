import type { DigitRead, DigitScript, UnreadableReason } from './types';
import { GRID, rasterizeStrokes, startQuadrant, type Stroke } from './strokes';
import { densifyStrokes, segmentIntoDigits, strokePointCount, strokeSpan } from './segment';
import weights from './models/digit_mlp.json';
import thresholds from './models/digit_thresholds.json';

type ConvLayer =
  | { w: number[][][][]; b: number[] }
  | { shape: number[]; w: number[]; b: number[] };

type DenseLayer = number[][] | { shape: number[]; w: number[] };

interface MlpWeights {
  kind?: 'mlp' | 'cnn';
  grid?: number;
  centroidGrid?: number;
  sizes?: number[];
  activation?: string;
  classes: number[];
  coefs?: number[][][];
  intercepts?: number[][];
  conv?: ConvLayer[];
  denseCoefs?: DenseLayer[];
  denseIntercepts?: number[][];
  scriptCentroids?: Partial<Record<DigitScript, number[][]>>;
}

const reshape4 = (flat: number[], shape: number[]): number[][][][] => {
  const [a, b, c, d] = shape;
  const out: number[][][][] = [];
  let i = 0;
  for (let ai = 0; ai < a; ai++) {
    const A: number[][][] = [];
    for (let bi = 0; bi < b; bi++) {
      const B: number[][] = [];
      for (let ci = 0; ci < c; ci++) {
        const C: number[] = [];
        for (let di = 0; di < d; di++) C.push(flat[i++]);
        B.push(C);
      }
      A.push(B);
    }
    out.push(A);
  }
  return out;
};

const reshape2 = (flat: number[], shape: number[]): number[][] => {
  const [rows, cols] = shape;
  const out: number[][] = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) row.push(flat[i++]);
    out.push(row);
  }
  return out;
};

const convKernel = (layer: ConvLayer): { w: number[][][][]; b: number[] } => {
  if (Array.isArray((layer as { w: unknown }).w) && !Array.isArray((layer as { w: unknown[] }).w[0])) {
    const flat = layer as { shape: number[]; w: number[]; b: number[] };
    return { w: reshape4(flat.w, flat.shape), b: flat.b };
  }
  return layer as { w: number[][][][]; b: number[] };
};

const denseMatrix = (layer: DenseLayer): number[][] => {
  if (!Array.isArray(layer) && 'shape' in layer) {
    return reshape2(layer.w, layer.shape);
  }
  return layer as number[][];
};

interface ThresholdFile {
  minConfidence: number;
  minMargin: number;
  minPoints: number;
  minSize: number;
  confirmConfidence?: number;
}

const model = weights as MlpWeights;
const limits = thresholds as ThresholdFile;
const gridSize = model.grid ?? GRID;

const relu = (x: number) => (x > 0 ? x : 0);

const softmax = (layer: number[]): number[] => {
  const max = Math.max(...layer);
  const exps = layer.map((value) => Math.exp(value - max));
  const total = exps.reduce((sum, value) => sum + value, 0) || 1;
  return exps.map((value) => value / total);
};

const mlpForward = (pixels: number[]): number[] => {
  const coefs = model.coefs ?? [];
  const intercepts = model.intercepts ?? [];
  let layer = pixels;
  for (let i = 0; i < coefs.length; i++) {
    const coef = coefs[i];
    const bias = intercepts[i];
    const next = new Array(bias.length).fill(0);
    for (let o = 0; o < bias.length; o++) {
      let sum = bias[o];
      for (let j = 0; j < layer.length; j++) sum += layer[j] * coef[j][o];
      next[o] = i === coefs.length - 1 ? sum : relu(sum);
    }
    layer = next;
  }
  return softmax(layer);
};

const convForward = (pixels: number[]): number[] => {
  let volume: number[][][] = Array.from({ length: gridSize }, (_, y) =>
    Array.from({ length: gridSize }, (_, x) => [pixels[y * gridSize + x] ?? 0])
  );

  for (const rawLayer of model.conv ?? []) {
    const layer = convKernel(rawLayer);
    const kh = layer.w.length;
    const kw = layer.w[0]?.length ?? 0;
    const cin = volume[0]?.[0]?.length ?? 0;
    const cout = layer.b.length;
    const height = volume.length;
    const width = volume[0]?.length ?? 0;
    const pad = Math.floor(kh / 2);
    const next: number[][][] = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => new Array(cout).fill(0))
    );
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let o = 0; o < cout; o++) {
          let sum = layer.b[o];
          for (let cy = 0; cy < kh; cy++) {
            for (let cx = 0; cx < kw; cx++) {
              const iy = y + cy - pad;
              const ix = x + cx - pad;
              if (iy < 0 || ix < 0 || iy >= height || ix >= width) continue;
              for (let c = 0; c < cin; c++) {
                sum += volume[iy][ix][c] * layer.w[cy][cx][c][o];
              }
            }
          }
          next[y][x][o] = relu(sum);
        }
      }
    }
    const pooled: number[][][] = [];
    for (let y = 0; y < height; y += 2) {
      const row: number[][] = [];
      for (let x = 0; x < width; x += 2) {
        const cell = new Array(cout).fill(0);
        for (let o = 0; o < cout; o++) {
          let best = 0;
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              best = Math.max(best, next[y + dy]?.[x + dx]?.[o] ?? 0);
            }
          }
          cell[o] = best;
        }
        row.push(cell);
      }
      pooled.push(row);
    }
    volume = pooled;
  }

  // Match PyTorch NCHW flatten order: channel, then y, then x.
  const outH = volume.length;
  const outW = volume[0]?.length ?? 0;
  const outC = volume[0]?.[0]?.length ?? 0;
  const flat = new Array(outH * outW * outC);
  let fi = 0;
  for (let c = 0; c < outC; c++) {
    for (let y = 0; y < outH; y++) {
      for (let x = 0; x < outW; x++) {
        flat[fi++] = volume[y][x][c];
      }
    }
  }
  const coefs = (model.denseCoefs ?? []).map(denseMatrix);
  const intercepts = model.denseIntercepts ?? [];
  let layer = flat;
  for (let i = 0; i < coefs.length; i++) {
    const bias = intercepts[i];
    const next = new Array(bias.length).fill(0);
    for (let o = 0; o < bias.length; o++) {
      let sum = bias[o];
      for (let j = 0; j < layer.length; j++) sum += layer[j] * coefs[i][j][o];
      next[o] = i === coefs.length - 1 ? sum : relu(sum);
    }
    layer = next;
  }
  return softmax(layer);
};

export const digitProbabilities = (pixels: number[]): number[] =>
  model.kind === 'cnn' ? convForward(pixels) : mlpForward(pixels);

const squaredDistance = (a: number[], b: number[]): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    sum += diff * diff;
  }
  return sum;
};

const poolCentroid = (pixels: number[], side: number): number[] => {
  const src = Math.sqrt(pixels.length);
  if (!Number.isFinite(src) || src * src !== pixels.length) return pixels;
  const block = src / side;
  if (!Number.isInteger(block)) return pixels;
  const out = new Array(side * side).fill(0);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      let sum = 0;
      for (let dy = 0; dy < block; dy++) {
        for (let dx = 0; dx < block; dx++) {
          sum += pixels[(y * block + dy) * src + (x * block + dx)] ?? 0;
        }
      }
      out[y * side + x] = sum / (block * block);
    }
  }
  return out;
};

export const guessDigitScript = (pixels: number[], digit: number): DigitScript => {
  const centroids = model.scriptCentroids;
  if (!centroids) return 'western';
  const side = model.centroidGrid ?? Math.sqrt(centroids.western?.[0]?.length ?? pixels.length);
  const probe = side && side * side !== pixels.length ? poolCentroid(pixels, side) : pixels;
  const scripts: DigitScript[] = ['western', 'arabic', 'devanagari'];
  let best: DigitScript = 'western';
  let bestDistance = Infinity;
  for (const script of scripts) {
    const row = centroids[script]?.[digit];
    if (!row) continue;
    const distance = squaredDistance(probe, row);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = script;
    }
  }
  return best;
};

/** Reversal shapes are Latin 2/5/6/9. Other scripts must not be flagged. */
export const likelyReversed = (digit: number, quadrant: number, script: DigitScript): boolean => {
  if (script !== 'western') return false;
  if (digit === 6 && quadrant === 3) return true;
  if (digit === 9 && quadrant === 2) return true;
  if (digit === 2 && quadrant === 2) return true;
  if (digit === 5 && quadrant === 3) return true;
  return false;
};

const unreadable = (
  reason: UnreadableReason,
  strokes: Stroke[],
  extra?: Partial<DigitRead>
): DigitRead => ({
  status: 'unreadable',
  digit: 0,
  confidence: extra?.confidence ?? 0,
  reversal: false,
  strokeCount: strokes.length,
  startQuadrant: startQuadrant(strokes),
  reason,
});

interface OneDigit {
  ok: boolean;
  reason?: UnreadableReason;
  digit: number;
  confidence: number;
  margin: number;
  reversal: boolean;
  script: DigitScript;
}

const classifyGroup = (strokes: Stroke[]): OneDigit => {
  const pixels = rasterizeStrokes(strokes);
  const probs = digitProbabilities(pixels);
  let best = 0;
  let second = probs.length > 1 ? 1 : 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[best]) {
      second = best;
      best = i;
    } else if (i !== best && probs[i] > probs[second]) {
      second = i;
    }
  }
  if (second === best && probs.length > 1) second = best === 0 ? 1 : 0;
  const digit = model.classes[best] ?? best;
  const confidence = probs[best] ?? 0;
  if (digit < 0 || digit > 9) {
    return { ok: false, reason: 'low_confidence', digit: 0, confidence, margin: 0, reversal: false, script: 'western' };
  }
  const margin = confidence - (probs[second] ?? 0);
  const script = guessDigitScript(pixels, digit);
  const quadrant = startQuadrant(strokes);
  if (confidence < limits.minConfidence) {
    return { ok: false, reason: 'low_confidence', digit, confidence, margin, reversal: false, script };
  }
  if (margin < limits.minMargin) {
    return { ok: false, reason: 'ambiguous', digit, confidence, margin, reversal: false, script };
  }
  return {
    ok: true,
    digit,
    confidence,
    margin,
    reversal: likelyReversed(digit, quadrant, script),
    script,
  };
};

/** High confidence skips the "Did you write this?" question. */
export const confirmConfidence = (): number => {
  if (typeof limits.confirmConfidence === 'number') return limits.confirmConfidence;
  return Math.min(0.97, limits.minConfidence + 0.12);
};

export const needsConfirm = (read: DigitRead): boolean => {
  if (read.status !== 'ok') return false;
  // Multi-digit or unusually wide ink always confirms — never silently score a merge mistake.
  if ((read.parts?.length ?? 1) > 1 || read.wide) return true;
  return read.confidence < confirmConfidence();
};

const inkAspect = (strokes: Stroke[]): number => {
  const pts = strokes.flat();
  if (pts.length === 0) return 1;
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
  return w / h;
};

/** Read up to three digits. Unreadable drawings are not scored as wrong. */
export const readDrawing = (strokes: Stroke[]): DigitRead => {
  const counted = densifyStrokes(strokes);
  if (strokePointCount(counted) < limits.minPoints) return unreadable('too_few_points', strokes);
  if (strokeSpan(strokes) < limits.minSize) return unreadable('too_small', strokes);
  const segmented = segmentIntoDigits(strokes);
  if (segmented.tooMany) return unreadable('too_many_parts', strokes);
  if (segmented.groups.length === 0) return unreadable('too_few_points', strokes);

  const parts = segmented.groups.map((group) => classifyGroup(group.strokes));
  const failed = parts.find((part) => !part.ok);
  if (failed) {
    return unreadable(failed.reason ?? 'low_confidence', strokes, { confidence: failed.confidence });
  }
  const digits = parts.map((part) => part.digit);
  const value = digits.reduce((total, digit) => total * 10 + digit, 0);
  const wide = inkAspect(strokes) >= 1.35;
  return {
    status: 'ok',
    digit: value,
    confidence: Math.min(...parts.map((part) => part.confidence)),
    reversal: parts.some((part) => part.reversal),
    strokeCount: strokes.length,
    startQuadrant: startQuadrant(strokes),
    parts: digits,
    script: parts[0]?.script,
    wide,
  };
};

export const readDrawnDigit = (strokes: Stroke[]): DigitRead | null => {
  if (strokes.length === 0) return null;
  return readDrawing(strokes);
};
