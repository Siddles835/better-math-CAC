import { describe, expect, it } from 'vitest';
import { createMemoryObjectStore } from './store';
import type { ObjectSticker } from './types';

describe('object store (memory)', () => {
  it('lists builtins, saves photos, and deletes them', async () => {
    const store = createMemoryObjectStore();
    const list = await store.list();
    expect(list.some((item) => item.id === 'builtin:crayon')).toBe(true);
    const sticker: ObjectSticker = {
      id: 'photo-1',
      kind: 'photo',
      name: { one: 'block', many: 'blocks' },
      lang: 'en',
      createdAt: 1,
      width: 64,
      height: 64,
      segmentation: 'classic',
      enabled: true,
    };
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    await store.savePhoto(sticker, { full: blob, thumb: blob });
    expect((await store.list()).some((item) => item.id === 'photo-1')).toBe(true);
    expect((await store.getBlobs('photo-1'))?.full.size).toBe(3);
    await store.remove('photo-1');
    expect(await store.get('photo-1')).toBeNull();
  });
});
