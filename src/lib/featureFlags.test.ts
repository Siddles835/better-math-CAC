import { describe, expect, it } from 'vitest';
import { ENABLE_CLASS_PHOTO_SHARING } from './featureFlags';

describe('featureFlags', () => {
  it('keeps class photo sharing off by default', () => {
    expect(ENABLE_CLASS_PHOTO_SHARING).toBe(false);
  });
});
