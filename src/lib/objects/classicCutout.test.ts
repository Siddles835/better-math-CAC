import { describe, expect, it } from 'vitest';
import { classicCutoutFromImageData } from './classicCutout';

describe('classicCutoutFromImageData', () => {
  it('keeps a contrasting center blob and rejects empty images', () => {
    if (typeof document === 'undefined' || !document.createElement('canvas').getContext) {
      return;
    }
    const w = 64;
    const h = 64;
    const empty = new ImageData(w, h);
    for (let i = 0; i < w * h; i += 1) {
      empty.data[i * 4] = 240;
      empty.data[i * 4 + 1] = 240;
      empty.data[i * 4 + 2] = 240;
      empty.data[i * 4 + 3] = 255;
    }
    expect(classicCutoutFromImageData(empty).ok).toBe(false);

    const withObject = new ImageData(w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        const inside = x > 20 && x < 44 && y > 20 && y < 44;
        withObject.data[i] = inside ? 30 : 240;
        withObject.data[i + 1] = inside ? 90 : 240;
        withObject.data[i + 2] = inside ? 200 : 240;
        withObject.data[i + 3] = 255;
      }
    }
    const result = classicCutoutFromImageData(withObject);
    expect(result.ok).toBe(true);
    expect(result.coverage).toBeGreaterThan(0.03);
    expect(result.coverage).toBeLessThan(0.95);
  });
});
