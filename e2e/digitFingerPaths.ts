/** Western digit stroke templates in a 0–80 box (same family as ml/train_cognition.py). */
export type Pt = { x: number; y: number };
export type PathStroke = Pt[];

export const WESTERN: Record<number, PathStroke[]> = {
  0: [[{ x: 24, y: 16 }, { x: 56, y: 16 }, { x: 64, y: 40 }, { x: 56, y: 64 }, { x: 24, y: 64 }, { x: 16, y: 40 }, { x: 24, y: 16 }]],
  1: [
    [{ x: 40, y: 12 }, { x: 40, y: 68 }],
    [{ x: 28, y: 24 }, { x: 40, y: 12 }],
  ],
  2: [[{ x: 18, y: 22 }, { x: 58, y: 16 }, { x: 62, y: 36 }, { x: 20, y: 64 }, { x: 64, y: 66 }]],
  3: [[{ x: 18, y: 16 }, { x: 58, y: 16 }, { x: 58, y: 36 }, { x: 30, y: 40 }, { x: 60, y: 48 }, { x: 58, y: 66 }, { x: 18, y: 66 }]],
  4: [
    [{ x: 18, y: 12 }, { x: 18, y: 40 }, { x: 64, y: 40 }],
    [{ x: 50, y: 12 }, { x: 50, y: 70 }],
  ],
  5: [[{ x: 62, y: 14 }, { x: 18, y: 16 }, { x: 18, y: 36 }, { x: 56, y: 36 }, { x: 60, y: 66 }, { x: 18, y: 66 }]],
  6: [[{ x: 58, y: 16 }, { x: 22, y: 28 }, { x: 18, y: 64 }, { x: 56, y: 66 }, { x: 60, y: 44 }, { x: 20, y: 40 }]],
  7: [
    [{ x: 16, y: 14 }, { x: 64, y: 14 }, { x: 36, y: 70 }],
    [{ x: 16, y: 14 }, { x: 40, y: 14 }],
  ],
  8: [[{ x: 40, y: 12 }, { x: 62, y: 24 }, { x: 40, y: 40 }, { x: 18, y: 56 }, { x: 40, y: 68 }, { x: 62, y: 56 }, { x: 40, y: 40 }, { x: 18, y: 24 }, { x: 40, y: 12 }]],
  9: [[{ x: 56, y: 40 }, { x: 20, y: 40 }, { x: 18, y: 16 }, { x: 56, y: 14 }, { x: 60, y: 68 }]],
};

export interface FingerVariant {
  label: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotDeg: number;
  shear: number;
  wobble: number;
  speed: number; // ms between points
  multiStrokeForce?: boolean;
}

/** 32 variants: speed, size, wobble, slant, offset, multi-stroke emphasis. */
export const VARIANTS: FingerVariant[] = (() => {
  const out: FingerVariant[] = [];
  for (let i = 0; i < 32; i++) {
    const hard = i % 3 !== 0;
    out.push({
      label: `v${i}`,
      scale: hard ? 0.65 + (i % 7) * 0.12 : 0.9 + (i % 4) * 0.08,
      offsetX: ((i * 7) % 40) - 12,
      offsetY: ((i * 11) % 36) - 10,
      rotDeg: hard ? -18 + (i % 9) * 4 : -6 + (i % 5) * 3,
      shear: hard ? -0.22 + (i % 8) * 0.06 : -0.08 + (i % 5) * 0.04,
      wobble: hard ? 2.2 + (i % 5) * 0.7 : 0.6 + (i % 4) * 0.3,
      speed: hard ? 8 + (i % 6) * 4 : 14 + (i % 4) * 6,
      multiStrokeForce: i % 4 === 0,
    });
  }
  return out;
})();

const mulberry = (seed: number) => {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const transformDigit = (
  digit: number,
  variant: FingerVariant,
  seed: number
): PathStroke[] => {
  const base = WESTERN[digit].map((stroke) => stroke.map((p) => ({ ...p })));
  const rot = (variant.rotDeg * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return mulberry(s);
  };

  const out: PathStroke[] = [];
  for (const stroke of base) {
    const pts: Pt[] = [];
    for (const p of stroke) {
      let x = (p.x - 40) * variant.scale;
      let y = (p.y - 40) * variant.scale;
      x = x + variant.shear * y;
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;
      pts.push({
        x: rx + 40 + variant.offsetX + (rnd() * 2 - 1) * variant.wobble,
        y: ry + 40 + variant.offsetY + (rnd() * 2 - 1) * variant.wobble,
      });
    }
    // Densify along edges so finger paths have many samples.
    const dense: Pt[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(2, Math.round(dist / 3));
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        dense.push({
          x: a.x + (b.x - a.x) * t + (rnd() * 2 - 1) * variant.wobble * 0.35,
          y: a.y + (b.y - a.y) * t + (rnd() * 2 - 1) * variant.wobble * 0.35,
        });
      }
    }
    out.push(dense);
    if (variant.multiStrokeForce && dense.length > 4) {
      const dx = (rnd() * 2 - 1) * 1.8;
      const dy = (rnd() * 2 - 1) * 1.8;
      out.push(dense.map((p) => ({ x: p.x + dx, y: p.y + dy })));
    }
  }
  return out;
};

/** Place template coords into a canvas of given size (templates are ~0–80). */
export const toCanvasCoords = (strokes: PathStroke[], width: number, height: number): PathStroke[] => {
  const pad = 24;
  const scale = Math.min((width - pad * 2) / 80, (height - pad * 2) / 80);
  return strokes.map((stroke) =>
    stroke.map((p) => ({
      x: pad + p.x * scale,
      y: pad + p.y * scale,
    }))
  );
};

export const MULTI_VALUES = [10, 12, 45, 99, 100] as const;

export const multiDigitStrokes = (
  value: number,
  variant: FingerVariant,
  seed: number
): PathStroke[] => {
  const digits = String(value).split('').map(Number);
  const gap = 70;
  const all: PathStroke[] = [];
  digits.forEach((digit, index) => {
    const local = transformDigit(digit, { ...variant, offsetX: variant.offsetX + index * 6 }, seed + index * 17);
    for (const stroke of local) {
      all.push(stroke.map((p) => ({ x: p.x + index * gap, y: p.y })));
    }
  });
  return all;
};
