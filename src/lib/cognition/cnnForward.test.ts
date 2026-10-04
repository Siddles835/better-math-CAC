import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { digitProbabilities } from './digitModel';

describe('CNN forward parity', () => {
  it('matches Python golden probabilities within 1e-4', () => {
    const goldPath = path.resolve('ml/golden_cnn_forward.json');
    if (!fs.existsSync(goldPath)) return;
    const gold = JSON.parse(fs.readFileSync(goldPath, 'utf8')) as {
      inputs: number[][];
      probs: number[][];
    };
    for (let i = 0; i < gold.inputs.length; i++) {
      const got = digitProbabilities(gold.inputs[i]);
      const expected = gold.probs[i];
      expect(got.length).toBe(expected.length);
      let maxDiff = 0;
      for (let j = 0; j < got.length; j++) {
        maxDiff = Math.max(maxDiff, Math.abs(got[j] - expected[j]));
      }
      expect(maxDiff).toBeLessThanOrEqual(1e-4);
    }
  });
});
