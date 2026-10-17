import {
  classicCutoutFromImageData,
  cropAndScaleSticker,
  downscaleForCutout,
} from '@/lib/objects/classicCutout';
import { STICKER_MAX_PX, THUMB_MAX_PX, type SegmentationKind } from '@/lib/objects/types';

export interface PreparedSticker {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  segmentation: SegmentationKind;
  coverage: number;
}

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('encode'));
      },
      type,
      quality
    );
  });

const encodeSticker = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  try {
    return await canvasToBlob(canvas, 'image/webp', 0.85);
  } catch {
    return canvasToBlob(canvas, 'image/png', 0.92);
  }
};

const roundedRectSticker = (source: HTMLCanvasElement): HTMLCanvasElement => {
  const cropped = cropAndScaleSticker(source, STICKER_MAX_PX, 4);
  const out = document.createElement('canvas');
  out.width = cropped.width;
  out.height = cropped.height;
  const ctx = out.getContext('2d');
  if (!ctx) return cropped;
  const r = Math.min(24, Math.floor(Math.min(out.width, out.height) / 8));
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(out.width, 0, out.width, out.height, r);
  ctx.arcTo(out.width, out.height, 0, out.height, r);
  ctx.arcTo(0, out.height, 0, 0, r);
  ctx.arcTo(0, 0, out.width, 0, r);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(cropped, 0, 0);
  return out;
};

/**
 * Build a sticker from a photo Blob.
 * Tries classic cutout first in this build (ML strategy is wired for models under
 * public/models/ when present). Falls back to whole-photo rounded sticker.
 */
export const prepareStickerFromBlob = async (blob: Blob): Promise<PreparedSticker> => {
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  try {
    const { canvas, ctx } = await downscaleForCutout(bitmap);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const classic = classicCutoutFromImageData(imageData);

    let working = canvas;
    let segmentation: SegmentationKind = 'none';
    let coverage = 1;

    if (classic.ok) {
      working = classic.canvas;
      segmentation = 'classic';
      coverage = classic.coverage;
    } else {
      working = roundedRectSticker(canvas);
      segmentation = 'none';
    }

    const sticker = cropAndScaleSticker(working, STICKER_MAX_PX);
    const thumbCanvas = cropAndScaleSticker(sticker, THUMB_MAX_PX, 2);
    const full = await encodeSticker(sticker);
    const thumb = await encodeSticker(thumbCanvas);
    return {
      full,
      thumb,
      width: sticker.width,
      height: sticker.height,
      segmentation,
      coverage,
    };
  } finally {
    bitmap.close();
  }
};

/** Very light face heuristic: reject if a large skin-colored central blob dominates. */
export const likelyContainsFaceHeuristic = async (blob: Blob): Promise<boolean> => {
  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const { canvas, ctx } = await downscaleForCutout(bitmap);
    bitmap.close();
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let skin = 0;
    const total = width * height;
    for (let i = 0; i < total; i += 1) {
      const o = i * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) skin += 1;
    }
    return skin / total > 0.35;
  } catch {
    return false;
  }
};
