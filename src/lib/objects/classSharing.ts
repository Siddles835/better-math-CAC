import { stripUndefined } from '@/lib/data/stripUndefined';
import { ENABLE_CLASS_PHOTO_SHARING } from '@/lib/featureFlags';

/**
 * Class photo sharing is implemented but gated OFF.
 * Firestore rules are currently `allow read, write: if true`, so enabling
 * this would make shared cutouts readable by anyone who guesses a class code.
 * Do not flip the flag until rules are tightened.
 */
export const CLASS_PHOTO_SHARING_ENABLED = ENABLE_CLASS_PHOTO_SHARING;

export const CLASS_SHARE_MAX = 12;
export const CLASS_SHARE_MAX_BYTES = 64 * 1024;
export const CLASS_SHARE_MAX_PX = 256;

export interface SharedClassObject {
  id: string;
  name: { one: string; many: string };
  lang: string;
  width: number;
  height: number;
  /** Small WebP/PNG data URL, max ~64 KB. */
  dataUrl: string;
  createdAt: number;
  teacherOnly: true;
}

export const canShareClassObject = (): boolean => CLASS_PHOTO_SHARING_ENABLED;

/** Prepare a payload for Firestore. Never call setDoc when the flag is OFF. */
export const sharedClassObjectPayload = (object: SharedClassObject): SharedClassObject =>
  stripUndefined({ ...object, teacherOnly: true as const });

export const assertShareableDataUrl = (dataUrl: string): void => {
  if (!CLASS_PHOTO_SHARING_ENABLED) {
    throw new Error('Class photo sharing is disabled');
  }
  if (!dataUrl.startsWith('data:image/')) {
    throw new Error('Invalid image');
  }
  // Approximate byte size of base64 payload.
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bytes = Math.floor((b64.length * 3) / 4);
  if (bytes > CLASS_SHARE_MAX_BYTES) {
    throw new Error('Image too large to share');
  }
};
