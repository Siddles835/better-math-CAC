import type { AppLang } from '@/lib/i18n/language';

export type BuiltinObjectId =
  | 'apple'
  | 'pencil'
  | 'crayon'
  | 'die'
  | 'block'
  | 'button'
  | 'ball'
  | 'coin'
  | 'star'
  | 'planet';

export type SegmentationKind = 'ml' | 'classic' | 'manual' | 'none';

export interface ObjectSticker {
  id: string;
  kind: 'builtin' | 'photo';
  name: { one: string; many: string };
  lang: AppLang;
  createdAt: number;
  width: number;
  height: number;
  segmentation: SegmentationKind;
  enabled: boolean;
  /** Builtin catalog id when kind is builtin. */
  builtinId?: BuiltinObjectId;
}

export interface ObjectPrefs {
  /** Active sticker id, 'mix', or null for default apples/pencils. */
  activeId: string | 'mix' | null;
  showPicturesWithProblems: boolean;
  /** Solo grown-up gate for camera. */
  grownUpUnlocked: boolean;
}

export interface StoredPhotoBlobs {
  full: Blob;
  thumb: Blob;
}

export const MAX_PHOTO_OBJECTS = 24;
export const MAX_STORAGE_BYTES = 12 * 1024 * 1024;
export const STICKER_MAX_PX = 384;
export const THUMB_MAX_PX = 96;

export const BUILTIN_OBJECTS: Array<{
  id: BuiltinObjectId;
  name: { one: string; many: string };
}> = [
  { id: 'apple', name: { one: 'apple', many: 'apples' } },
  { id: 'pencil', name: { one: 'pencil', many: 'pencils' } },
  { id: 'crayon', name: { one: 'crayon', many: 'crayons' } },
  { id: 'die', name: { one: 'die', many: 'dice' } },
  { id: 'block', name: { one: 'block', many: 'blocks' } },
  { id: 'button', name: { one: 'button', many: 'buttons' } },
  { id: 'ball', name: { one: 'ball', many: 'balls' } },
  { id: 'coin', name: { one: 'coin', many: 'coins' } },
  { id: 'star', name: { one: 'star', many: 'stars' } },
  { id: 'planet', name: { one: 'planet', many: 'planets' } },
];
