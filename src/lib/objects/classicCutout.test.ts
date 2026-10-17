import { describe, expect, it } from 'vitest';
import { classicCutoutFromImageData } from './classicCutout';

const fill = (data: ImageData, r: number, g: number, b: number) => {
  for (let i = 0; i < data.width * data.height; i += 1) {
    data.data[i * 4] = r;
    data.data[i * 4 + 1] = g;
    data.data[i * 4 + 2] = b;
    data.data[i * 4 + 3] = 255;
  }
};

const paintRect = (
  data: ImageData,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  g: number,
  b: number
) => {
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * data.width + x) * 4;
      data.data[i] = r;
      data.data[i + 1] = g;
      data.data[i + 2] = b;
      data.data[i + 3] = 255;
    }
  }
};

describe('classicCutoutFromImageData', () => {
  it('keeps a contrasting center blob and rejects empty images', () => {
    if (typeof document === 'undefined' || !document.createElement('canvas').getContext) {
      return;
    }
    const w = 64;
    const h = 64;
    const empty = new ImageData(w, h);
    fill(empty, 240, 240, 240);
    expect(classicCutoutFromImageData(empty).ok).toBe(false);

    const withObject = new ImageData(w, h);
    fill(withObject, 240, 240, 240);
    paintRect(withObject, 20, 20, 44, 44, 30, 90, 200);
    const result = classicCutoutFromImageData(withObject);
    expect(result.ok).toBe(true);
    expect(result.coverage).toBeGreaterThan(0.03);
    expect(result.coverage).toBeLessThan(0.95);
  });

  it('rejects an all-one-color image and a near-full coverage disc', () => {
    if (typeof document === 'undefined' || !document.createElement('canvas').getContext) {
      return;
    }
    const solid = new ImageData(48, 48);
    fill(solid, 12, 12, 12);
    expect(classicCutoutFromImageData(solid).ok).toBe(false);

    const huge = new ImageData(64, 64);
    fill(huge, 250, 250, 250);
    paintRect(huge, 2, 2, 62, 62, 10, 10, 10);
    const hugeResult = classicCutoutFromImageData(huge);
    // Almost the whole frame is the \"object\" so sanity checks should fail.
    expect(hugeResult.ok).toBe(false);
  });

  it('still finds an object on a mildly noisy background', () => {
    if (typeof document === 'undefined' || !document.createElement('canvas').getContext) {
      return;
    }
    const noisy = new ImageData(80, 80);
    for (let y = 0; y < 80; y += 1) {
      for (let x = 0; x < 80; x += 1) {
        const i = (y * 80 + x) * 4;
        const jitter = ((x * 17 + y * 13) % 7) - 3;
        noisy.data[i] = 235 + jitter;
        noisy.data[i + 1] = 235 + jitter;
        noisy.data[i + 2] = 235 + jitter;
        noisy.data[i + 3] = 255;
      }
    }
    paintRect(noisy, 28, 28, 52, 52, 40, 120, 40);
    const result = classicCutoutFromImageData(noisy);
    expect(result.ok).toBe(true);
    expect(result.coverage).toBeGreaterThan(0.03);
  });
});
