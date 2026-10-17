/**
 * Build-time feature flags (Vite `import.meta.env`).
 * Class photo sharing stays OFF until Firestore rules no longer allow open write.
 */
export const ENABLE_CLASS_PHOTO_SHARING =
  import.meta.env.VITE_ENABLE_CLASS_PHOTO_SHARING === 'true';
