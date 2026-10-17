import {
  BUILTIN_OBJECTS,
  MAX_PHOTO_OBJECTS,
  MAX_STORAGE_BYTES,
  type ObjectSticker,
  type StoredPhotoBlobs,
} from '@/lib/objects/types';
import type { AppLang } from '@/lib/i18n/language';
import { loadLanguage } from '@/lib/i18n/language';

const DB_NAME = 'mathlift-objects';
const DB_VERSION = 1;
const META_STORE = 'meta';
const BLOB_STORE = 'blobs';

export interface ObjectStoreStats {
  photoCount: number;
  bytesUsed: number;
  sessionOnly: boolean;
}

export interface ObjectStore {
  list(): Promise<ObjectSticker[]>;
  get(id: string): Promise<ObjectSticker | null>;
  getBlobs(id: string): Promise<StoredPhotoBlobs | null>;
  savePhoto(sticker: ObjectSticker, blobs: StoredPhotoBlobs): Promise<void>;
  updateMeta(sticker: ObjectSticker): Promise<void>;
  remove(id: string): Promise<void>;
  clearPhotos(): Promise<void>;
  stats(): Promise<ObjectStoreStats>;
  builtins(): ObjectSticker[];
}

const builtins = (lang: AppLang = loadLanguage()): ObjectSticker[] =>
  BUILTIN_OBJECTS.map((item, index) => ({
    id: `builtin:${item.id}`,
    kind: 'builtin',
    builtinId: item.id,
    name: item.name,
    lang,
    createdAt: index,
    width: 128,
    height: 128,
    segmentation: 'none',
    enabled: true,
  }));

const openDb = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

const txDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('idb'));
    tx.onabort = () => reject(tx.error ?? new Error('idb-abort'));
  });

/** In-memory fallback when IndexedDB is unavailable. */
const createMemoryStore = (): ObjectStore => {
  const meta = new Map<string, ObjectSticker>();
  const blobs = new Map<string, StoredPhotoBlobs>();
  return {
    builtins,
    async list() {
      return [...builtins(), ...meta.values()].sort((a, b) => a.createdAt - b.createdAt);
    },
    async get(id) {
      return meta.get(id) ?? builtins().find((item) => item.id === id) ?? null;
    },
    async getBlobs(id) {
      return blobs.get(id) ?? null;
    },
    async savePhoto(sticker, photo) {
      const photos = [...meta.values()].filter((item) => item.kind === 'photo');
      if (photos.length >= MAX_PHOTO_OBJECTS && !meta.has(sticker.id)) {
        throw new Error('full');
      }
      meta.set(sticker.id, sticker);
      blobs.set(sticker.id, photo);
    },
    async updateMeta(sticker) {
      if (sticker.kind === 'builtin') return;
      meta.set(sticker.id, sticker);
    },
    async remove(id) {
      meta.delete(id);
      blobs.delete(id);
    },
    async clearPhotos() {
      for (const id of [...meta.keys()]) {
        if (meta.get(id)?.kind === 'photo') {
          meta.delete(id);
          blobs.delete(id);
        }
      }
    },
    async stats() {
      let bytes = 0;
      for (const photo of blobs.values()) {
        bytes += photo.full.size + photo.thumb.size;
      }
      return {
        photoCount: [...meta.values()].filter((item) => item.kind === 'photo').length,
        bytesUsed: bytes,
        sessionOnly: true,
      };
    },
  };
};

export const createIndexedDbStore = (): ObjectStore => {
  let memory: ObjectStore | null = null;
  const fallback = () => {
    memory ??= createMemoryStore();
    return memory;
  };

  return {
    builtins,
    async list() {
      const db = await openDb();
      if (!db) return fallback().list();
      try {
        const tx = db.transaction(META_STORE, 'readonly');
        const store = tx.objectStore(META_STORE);
        const rows = await new Promise<ObjectSticker[]>((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result as ObjectSticker[]);
          req.onerror = () => reject(req.error);
        });
        await txDone(tx);
        return [...builtins(), ...rows.filter((row) => row.kind === 'photo')].sort(
          (a, b) => a.createdAt - b.createdAt
        );
      } catch {
        return fallback().list();
      }
    },
    async get(id) {
      const built = builtins().find((item) => item.id === id);
      if (built) return built;
      const db = await openDb();
      if (!db) return fallback().get(id);
      try {
        const tx = db.transaction(META_STORE, 'readonly');
        const row = await new Promise<ObjectSticker | undefined>((resolve, reject) => {
          const req = tx.objectStore(META_STORE).get(id);
          req.onsuccess = () => resolve(req.result as ObjectSticker | undefined);
          req.onerror = () => reject(req.error);
        });
        await txDone(tx);
        return row ?? null;
      } catch {
        return fallback().get(id);
      }
    },
    async getBlobs(id) {
      const db = await openDb();
      if (!db) return fallback().getBlobs(id);
      try {
        const tx = db.transaction(BLOB_STORE, 'readonly');
        const row = await new Promise<{ id: string; full: Blob; thumb: Blob } | undefined>(
          (resolve, reject) => {
            const req = tx.objectStore(BLOB_STORE).get(id);
            req.onsuccess = () => resolve(req.result as { id: string; full: Blob; thumb: Blob } | undefined);
            req.onerror = () => reject(req.error);
          }
        );
        await txDone(tx);
        return row ? { full: row.full, thumb: row.thumb } : null;
      } catch {
        return fallback().getBlobs(id);
      }
    },
    async savePhoto(sticker, photo) {
      const current = await this.stats();
      if (current.photoCount >= MAX_PHOTO_OBJECTS) throw new Error('full');
      if (current.bytesUsed + photo.full.size + photo.thumb.size > MAX_STORAGE_BYTES) {
        throw new Error('storage');
      }
      const db = await openDb();
      if (!db) {
        await fallback().savePhoto(sticker, photo);
        return;
      }
      try {
        if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
          void navigator.storage.persist();
        }
        const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
        tx.objectStore(META_STORE).put(sticker);
        tx.objectStore(BLOB_STORE).put({ id: sticker.id, full: photo.full, thumb: photo.thumb });
        await txDone(tx);
      } catch {
        await fallback().savePhoto(sticker, photo);
      }
    },
    async updateMeta(sticker) {
      if (sticker.kind === 'builtin') return;
      const db = await openDb();
      if (!db) {
        await fallback().updateMeta(sticker);
        return;
      }
      try {
        const tx = db.transaction(META_STORE, 'readwrite');
        tx.objectStore(META_STORE).put(sticker);
        await txDone(tx);
      } catch {
        await fallback().updateMeta(sticker);
      }
    },
    async remove(id) {
      const db = await openDb();
      if (!db) {
        await fallback().remove(id);
        return;
      }
      try {
        const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
        tx.objectStore(META_STORE).delete(id);
        tx.objectStore(BLOB_STORE).delete(id);
        await txDone(tx);
      } catch {
        await fallback().remove(id);
      }
    },
    async clearPhotos() {
      const all = await this.list();
      for (const item of all) {
        if (item.kind === 'photo') await this.remove(item.id);
      }
    },
    async stats() {
      const db = await openDb();
      if (!db) return fallback().stats();
      try {
        const list = await this.list();
        const photos = list.filter((item) => item.kind === 'photo');
        let bytes = 0;
        for (const photo of photos) {
          const blobs = await this.getBlobs(photo.id);
          if (blobs) bytes += blobs.full.size + blobs.thumb.size;
        }
        return { photoCount: photos.length, bytesUsed: bytes, sessionOnly: false };
      } catch {
        return fallback().stats();
      }
    },
  };
};

let singleton: ObjectStore | null = null;
let nativeTried = false;

export const getObjectStore = (): ObjectStore => {
  if (!singleton) {
    singleton = createIndexedDbStore();
    if (!nativeTried && typeof window !== 'undefined') {
      nativeTried = true;
      void import('@/lib/objects/nativeStore')
        .then(({ createNativeObjectStore }) => createNativeObjectStore())
        .then((native) => {
          if (native) singleton = native;
        })
        .catch(() => {
          // Keep IndexedDB / memory store.
        });
    }
  }
  return singleton;
};

/** Test helper. */
export const createMemoryObjectStore = (): ObjectStore => createMemoryStore();
