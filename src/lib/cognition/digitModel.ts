import type { DigitRead } from './types';
import { rasterizeStrokes, startQuadrant, type Stroke } from './strokes';
import weights from './models/digit_mlp.json';

interface MlpWeights {
  sizes: number[];
  activation: string;
  classes: number[];
  coefs: number[][][];
  intercepts: number[][];
}

const mlp = weights as MlpWeights;

const relu = (x: number) => (x > 0 ? x : 0);

const forward = (pixels: number[]): number[] => {
  let layer = pixels;
  for (let i = 0; i < mlp.coefs.length; i++) {
    const coef = mlp.coefs[i];
    const bias = mlp.intercepts[i];
    const next = new Array(bias.length).fill(0);
    for (let o = 0; o < bias.length; o++) {
      let sum = bias[o];
      for (let j = 0; j < layer.length; j++) {
        sum += layer[j] * coef[j][o];
      }
      next[o] = i === mlp.coefs.length - 1 ? sum : relu(sum);
    }
    layer = next;
  }
  const max = Math.max(...layer);
  const exps = layer.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / total);
};

const likelyReversed = (digit: number, quadrant: number): boolean => {
  if (digit === 6 && quadrant === 3) return true;
  if (digit === 9 && quadrant === 2) return true;
  if (digit === 2 && quadrant === 2) return true;
  if (digit === 5 && quadrant === 3) return true;
  return false;
};

export const readDrawnDigit = (strokes: Stroke[]): DigitRead | null => {
  if (strokes.length === 0 || strokes.every((s) => s.length < 2)) return null;
  const pixels = rasterizeStrokes(strokes);
  const probs = forward(pixels);
  let best = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[best]) best = i;
  }
  const digit = mlp.classes[best] ?? best;
  const quadrant = startQuadrant(strokes);
  return {
    digit,
    confidence: probs[best],
    reversal: likelyReversed(digit, quadrant),
    strokeCount: strokes.length,
    startQuadrant: quadrant,
  };
};
