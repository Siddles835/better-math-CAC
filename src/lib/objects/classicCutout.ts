/**
 * Classical background removal: flood-fill from borders using a perceptual
 * color distance, keep the largest remaining component, feather alpha.
 * Designed for "one object on a plain table or paper".
 */

export interface CutoutResult {
  canvas: HTMLCanvasElement;
  coverage: number;
  ok: boolean;
}

const MAX_SIDE = 768;

const toLab = (r: number, g: number, b: number): [number, number, number] => {
  // sRGB to XYZ to Lab (D65). Values 0 to 255 in.
  let R = r / 255;
  let G = g / 255;
  let B = b / 255;
  R = R > 0.04045 ? ((R + 0.055) / 1.055) ** 2.4 : R / 12.92;
  G = G > 0.04045 ? ((G + 0.055) / 1.055) ** 2.4 : G / 12.92;
  B = B > 0.04045 ? ((B + 0.055) / 1.055) ** 2.4 : B / 12.92;
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const deltaE = (a: [number, number, number], b: [number, number, number]): number => {
  const dL = a[0] - b[0];
  const dA = a[1] - b[1];
  const dB = a[2] - b[2];
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
};

const estimateBackground = (data: Uint8ClampedArray, w: number, h: number): [number, number, number] => {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += 1;
  };
  for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 40))) {
    sample(x, 0);
    sample(x, h - 1);
  }
  for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 40))) {
    sample(0, y);
    sample(w - 1, y);
  }
  return [r / n, g / n, b / n];
};

export const classicCutoutFromImageData = (source: ImageData): CutoutResult => {
  const { width: w, height: h, data } = source;
  const bg = estimateBackground(data, w, h);
  const bgLab = toLab(bg[0], bg[1], bg[2]);
  const mask = new Uint8Array(w * h);
  const threshold = 28;

  for (let i = 0; i < w * h; i += 1) {
    const o = i * 4;
    const lab = toLab(data[o], data[o + 1], data[o + 2]);
    mask[i] = deltaE(lab, bgLab) > threshold ? 1 : 0;
  }

  // Flood-fill background from borders into mask=0.
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (seen[i] || mask[i] === 1) return;
    seen[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x += 1) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop()!;
    mask[i] = 0;
    const x = i % w;
    const y = (i / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // Keep largest connected component of foreground.
  const labels = new Int32Array(w * h);
  let bestLabel = 0;
  let bestSize = 0;
  let nextLabel = 1;
  for (let i = 0; i < w * h; i += 1) {
    if (!mask[i] || labels[i]) continue;
    const queue = [i];
    labels[i] = nextLabel;
    let size = 0;
    while (queue.length) {
      const cur = queue.pop()!;
      size += 1;
      const x = cur % w;
      const y = (cur / w) | 0;
      const neighbors = [cur + 1, cur - 1, cur + w, cur - w];
      for (const n of neighbors) {
        if (n < 0 || n >= w * h) continue;
        if (!mask[n] || labels[n]) continue;
        const nx = n % w;
        if (Math.abs(nx - x) + Math.abs(((n / w) | 0) - y) !== 1) continue;
        labels[n] = nextLabel;
        queue.push(n);
      }
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = nextLabel;
    }
    nextLabel += 1;
  }

  const out = new ImageData(w, h);
  let kept = 0;
  for (let i = 0; i < w * h; i += 1) {
    const o = i * 4;
    if (labels[i] === bestLabel) {
      out.data[o] = data[o];
      out.data[o + 1] = data[o + 1];
      out.data[o + 2] = data[o + 2];
      out.data[o + 3] = 255;
      kept += 1;
    } else {
      out.data[o + 3] = 0;
    }
  }

  const coverage = kept / (w * h);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, coverage, ok: false };
  ctx.putImageData(out, 0, 0);

  const ok = coverage >= 0.03 && coverage <= 0.95 && bestSize > 40;
  return { canvas, coverage, ok };
};

export const downscaleForCutout = async (
  bitmap: ImageBitmap
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> => {
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { canvas, ctx };
};

/** Crop to opaque bounds with padding, then scale to maxSide. */
export const cropAndScaleSticker = (
  source: HTMLCanvasElement,
  maxSide: number,
  padding = 8
): HTMLCanvasElement => {
  const ctx = source.getContext('2d');
  if (!ctx) return source;
  const { width: w, height: h } = source;
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX) return source;
  const sx = Math.max(0, minX - padding);
  const sy = Math.max(0, minY - padding);
  const sw = Math.min(w - sx, maxX - minX + 1 + padding * 2);
  const sh = Math.min(h - sy, maxY - minY + 1 + padding * 2);
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(sw * scale));
  out.height = Math.max(1, Math.round(sh * scale));
  const octx = out.getContext('2d');
  if (!octx) return source;
  octx.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out;
};
