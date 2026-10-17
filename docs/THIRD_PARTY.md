# Third-party notice (My Objects)

## Classic cutout (first-party)

The background-removal path in `src/lib/objects/classicCutout.ts` is first-party MathLift code. It flood-fills from image borders using a perceptual color distance, keeps the largest remaining component, and encodes the sticker through a canvas so EXIF metadata is stripped. No third-party segmentation library is required for this path.

## MediaPipe (deferred)

Google MediaPipe image segmentation / face helpers are **not bundled** in this build. Models and WASM under `public/models/` are not shipped yet. When MediaPipe is added later:

- Prefer Apache-2.0 licensed MediaPipe packages and model assets.
- Document the exact package versions and model files in this notice.
- Keep classic cutout as the offline fallback when ML fails or times out.

Until then, `prepareStickerFromBlob` uses classic cutout (`strategy: 'auto'`) or a whole-photo rounded sticker (`strategy: 'none'`).

## Capacitor Camera and Filesystem

- `@capacitor/camera` (Apache-2.0): native `takePhoto` / `getPhoto` and gallery pick when `Capacitor.isNativePlatform()` is true. On the web, capture uses `getUserMedia` with a file-picker fallback.
- `@capacitor/filesystem` (Apache-2.0): native sticker blob storage under `Directory.Data` so WebView IndexedDB eviction does not wipe My Objects on iOS.
