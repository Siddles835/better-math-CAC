import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, withCalmMode } from '@/lib/accessibility';

describe('withCalmMode', () => {
  it('turns on calm with reduce motion and muted SFX', () => {
    const next = withCalmMode(DEFAULT_PREFS, true);
    expect(next.calmBackground).toBe(true);
    expect(next.reduceMotion).toBe(true);
    expect(next.muteSounds).toBe(true);
  });

  it('clears only the calm flag when turning off', () => {
    const on = withCalmMode(DEFAULT_PREFS, true);
    const off = withCalmMode(on, false);
    expect(off.calmBackground).toBe(false);
    expect(off.reduceMotion).toBe(true);
    expect(off.muteSounds).toBe(true);
  });
});
