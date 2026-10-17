import { Capacitor } from '@capacitor/core';

/** Minimal shape shared by @capacitor/camera getPhoto / takePhoto results. */
export interface NativePhotoResult {
  webPath?: string;
  dataUrl?: string;
  path?: string;
  format?: string;
}

interface NativeCameraPlugin {
  takePhoto?: (options: Record<string, unknown>) => Promise<NativePhotoResult>;
  getPhoto?: (options: Record<string, unknown>) => Promise<NativePhotoResult>;
  pickImages?: (options: Record<string, unknown>) => Promise<{ photos?: NativePhotoResult[] }>;
}

interface NativeCameraModule {
  Camera?: NativeCameraPlugin;
  CameraResultType?: { Uri?: string; DataUrl?: string; Base64?: string };
  CameraSource?: { Camera?: string; Photos?: string; Prompt?: string };
}

const loadCameraModule = async (): Promise<NativeCameraModule | null> => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    // Avoid a static import so typecheck/build succeed when the optional package is absent.
    const dynamicImport = new Function('specifier', 'return import(specifier)') as (
      specifier: string
    ) => Promise<NativeCameraModule>;
    return await dynamicImport('@capacitor/camera');
  } catch {
    return null;
  }
};

export const isNativeCameraAvailable = async (): Promise<boolean> => {
  const mod = await loadCameraModule();
  const camera = mod?.Camera;
  return !!(camera && (typeof camera.takePhoto === 'function' || typeof camera.getPhoto === 'function'));
};

const resultToBlob = async (photo: NativePhotoResult): Promise<Blob | null> => {
  if (photo.dataUrl?.startsWith('data:')) {
    const res = await fetch(photo.dataUrl);
    return res.blob();
  }
  const path = photo.webPath ?? photo.path;
  if (!path) return null;
  const url = Capacitor.convertFileSrc ? Capacitor.convertFileSrc(path) : path;
  const res = await fetch(url);
  return res.blob();
};

/**
 * Take a photo with the native Capacitor Camera plugin when installed.
 * Prefers `takePhoto` (newer) and falls back to `getPhoto` (older).
 */
export const nativeTakePhoto = async (): Promise<Blob | null> => {
  const mod = await loadCameraModule();
  const camera = mod?.Camera;
  if (!camera) return null;
  const resultType = mod.CameraResultType?.Uri ?? 'uri';
  const opts = {
    quality: 90,
    allowEditing: false,
    saveToGallery: false,
    correctOrientation: true,
    resultType,
  };
  let photo: NativePhotoResult;
  if (typeof camera.takePhoto === 'function') {
    photo = await camera.takePhoto(opts);
  } else if (typeof camera.getPhoto === 'function') {
    photo = await camera.getPhoto({
      ...opts,
      source: mod.CameraSource?.Camera ?? 'CAMERA',
    });
  } else {
    return null;
  }
  return resultToBlob(photo);
};

/**
 * Choose from the gallery. Prefers pickImages / Photos source on getPhoto.
 */
export const nativeChooseFromGallery = async (): Promise<Blob | null> => {
  const mod = await loadCameraModule();
  const camera = mod?.Camera;
  if (!camera) return null;
  const resultType = mod.CameraResultType?.Uri ?? 'uri';

  if (typeof camera.pickImages === 'function') {
    const picked = await camera.pickImages({
      quality: 90,
      limit: 1,
      correctOrientation: true,
    });
    const first = picked.photos?.[0];
    return first ? resultToBlob(first) : null;
  }

  if (typeof camera.getPhoto === 'function') {
    const photo = await camera.getPhoto({
      quality: 90,
      allowEditing: false,
      saveToGallery: false,
      correctOrientation: true,
      resultType,
      source: mod.CameraSource?.Photos ?? 'PHOTOS',
    });
    return resultToBlob(photo);
  }

  return null;
};
