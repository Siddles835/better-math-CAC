/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_CLASS_PHOTO_SHARING?: string;
  /** Absolute origin for /api/tts when the app is not on the same host (Capacitor). */
  readonly VITE_TTS_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}
