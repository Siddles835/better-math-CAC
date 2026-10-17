/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_CLASS_PHOTO_SHARING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
