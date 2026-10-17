import { Capacitor } from '@capacitor/core';
import type { ObjectSticker, StoredPhotoBlobs } from '@/lib/objects/types';
import {
  BUILTIN_OBJECTS,
  MAX_PHOTO_OBJECTS,
  MAX_STORAGE_BYTES,
} from '@/lib/objects/types';
import type { ObjectStore, ObjectStoreStats } from '@/lib/objects/store';
import { loadLanguage, type AppLang } from '@/lib/i18n/language';

const META_FILE = 'objects-meta.json';
const BLOB_DIR = 'object-blobs';

interface NativeFs {
  readFile: (options: Record<string, unknown>) => Promise<{ data?: string }>;
  writeFile: (options: Record<string, unknown>) => Promise<unknown>;
  deleteFile: (options: Record<string, unknown>) => Promise<unknown>;
  mkdir: (options: Record<string, unknown>) => Promise<unknown>;
  readdir: (options: Record<string, unknown>) => Promise<{ files?: Array<string | { name: string }> }>;
}

interface NativeFsModule {
  Filesystem?: NativeFs;
  Directory?: { Data?: string };
  Encoding?: { UTF8?: string };
}

const builtins = (lang: AppLang = loadLanguage()): ObjectSticker[] =>
  BUILTIN_OBJECTS.map((item, index) => ({
    id: `builtin:${item.id}`,
    kind: 'builtin' as const,
    builtinId: item.id,
    name: item.name,
    lang,
    createdAt: index,
    width: 128,
    height: 128,
    segmentation: 'none' as const,
    enabled: true,
  }));

const loadFs = async (): Promise<{ fs: NativeFs; Directory: { Data: string }; Encoding: { UTF8: string } } | null> => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const dynamicImport = new Function('specifier', 'return import(specifier)') as (
      specifier: string
    ) => Promise<NativeFsModule>;
    const mod = await dynamicImport('@capacitor/filesystem');
    const Directory = mod.Directory?.Data;
    const Encoding = mod.Encoding?.UTF8;
    if (!mod.Filesystem || !Directory || !Encoding) return null;
    return { fs: mod.Filesystem, Directory: { Data: Directory }, Encoding: { UTF8: Encoding } };
  } catch {
    return null;
  }
};

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
};

const base64ToBlob = (b64: string, type: string): Blob => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
};

/** Capacitor Filesystem-backed store for native iOS (WebView storage can be evicted). */
export const createNativeObjectStore = async (): Promise<ObjectStore | null> => {
  const native = await loadFs();
  if (!native) return null;
  const { fs, Directory, Encoding } = native;

  const ensureDir = async () => {
    try {
      await fs.mkdir({ path: BLOB_DIR, directory: Directory.Data, recursive: true });
    } catch {
      // exists
    }
  };

  const readMeta = async (): Promise<ObjectSticker[]> => {
    try {
      const result = await fs.readFile({
        path: META_FILE,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      const parsed = JSON.parse(String(result.data ?? '[]')) as ObjectSticker[];
      return Array.isArray(parsed) ? parsed.filter((row) => row.kind === 'photo') : [];
    } catch {
      return [];
    }
  };

  const writeMeta = async (rows: ObjectSticker[]) => {
    await fs.writeFile({
      path: META_FILE,
      directory: Directory.Data,
      data: JSON.stringify(rows),
      encoding: Encoding.UTF8,
    });
  };

  await ensureDir();

  const store: ObjectStore = {
    builtins,
    async list() {
      const photos = await readMeta();
      return [...builtins(), ...photos].sort((a, b) => a.createdAt - b.createdAt);
    },
    async get(id) {
      const built = builtins().find((item) => item.id === id);
      if (built) return built;
      return (await readMeta()).find((item) => item.id === id) ?? null;
    },
    async getBlobs(id) {
      try {
        const full = await fs.readFile({ path: `${BLOB_DIR}/${id}.full`, directory: Directory.Data });
        const thumb = await fs.readFile({ path: `${BLOB_DIR}/${id}.thumb`, directory: Directory.Data });
        if (!full.data || !thumb.data) return null;
        return {
          full: base64ToBlob(String(full.data), 'image/webp'),
          thumb: base64ToBlob(String(thumb.data), 'image/webp'),
        };
      } catch {
        return null;
      }
    },
    async savePhoto(sticker, photo) {
      const photos = await readMeta();
      if (photos.length >= MAX_PHOTO_OBJECTS && !photos.some((item) => item.id === sticker.id)) {
        throw new Error('full');
      }
      const stats = await this.stats();
      if (stats.bytesUsed + photo.full.size + photo.thumb.size > MAX_STORAGE_BYTES) {
        throw new Error('storage');
      }
      await ensureDir();
      await fs.writeFile({
        path: `${BLOB_DIR}/${sticker.id}.full`,
        directory: Directory.Data,
        data: await blobToBase64(photo.full),
      });
      await fs.writeFile({
        path: `${BLOB_DIR}/${sticker.id}.thumb`,
        directory: Directory.Data,
        data: await blobToBase64(photo.thumb),
      });
      const next = [...photos.filter((item) => item.id !== sticker.id), sticker];
      await writeMeta(next);
    },
    async updateMeta(sticker) {
      if (sticker.kind === 'builtin') return;
      const photos = await readMeta();
      await writeMeta(photos.map((item) => (item.id === sticker.id ? sticker : item)));
    },
    async remove(id) {
      const photos = await readMeta();
      await writeMeta(photos.filter((item) => item.id !== id));
      for (const suffix of ['full', 'thumb'] as const) {
        try {
          await fs.deleteFile({ path: `${BLOB_DIR}/${id}.${suffix}`, directory: Directory.Data });
        } catch {
          // missing
        }
      }
    },
    async clearPhotos() {
      const photos = await readMeta();
      for (const item of photos) await this.remove(item.id);
    },
    async stats(): Promise<ObjectStoreStats> {
      const photos = await readMeta();
      let bytes = 0;
      for (const photo of photos) {
        const blobs = await this.getBlobs(photo.id);
        if (blobs) bytes += blobs.full.size + blobs.thumb.size;
      }
      return { photoCount: photos.length, bytesUsed: bytes, sessionOnly: false };
    },
  };

  return store;
};

export type { StoredPhotoBlobs };
