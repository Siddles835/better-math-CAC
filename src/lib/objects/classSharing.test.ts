import { describe, expect, it } from 'vitest';
import {
  assertShareableDataUrl,
  canShareClassObject,
  CLASS_PHOTO_SHARING_ENABLED,
  sharedClassObjectPayload,
} from './classSharing';

describe('classSharing', () => {
  it('stays disabled unless the env flag is true', () => {
    expect(CLASS_PHOTO_SHARING_ENABLED).toBe(false);
    expect(canShareClassObject()).toBe(false);
  });

  it('stripUndefined keeps a clean share payload shape', () => {
    const payload = sharedClassObjectPayload({
      id: 'obj-1',
      name: { one: 'pencil', many: 'pencils' },
      lang: 'en',
      width: 96,
      height: 96,
      dataUrl: 'data:image/webp;base64,AAAA',
      createdAt: 1,
      teacherOnly: true,
    });
    expect(payload.teacherOnly).toBe(true);
    expect(payload.name.one).toBe('pencil');
  });

  it('rejects share attempts while the flag is off', () => {
    expect(() => assertShareableDataUrl('data:image/webp;base64,AAAA')).toThrow(
      /disabled/i
    );
  });
});
