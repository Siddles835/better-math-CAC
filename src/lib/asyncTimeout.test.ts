import { describe, expect, it, vi } from 'vitest';
import { withTimeout, withTimeoutFallback } from './asyncTimeout';

describe('withTimeout', () => {
  it('returns the value when the promise resolves in time', async () => {
    await expect(withTimeout(Promise.resolve(7), 100, 'ok')).resolves.toBe(7);
  });

  it('rejects when the promise is too slow', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => undefined), 50, 'slow');
    const assertion = expect(pending).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
    vi.useRealTimers();
  });

  it('falls back instead of throwing', async () => {
    vi.useFakeTimers();
    const pending = withTimeoutFallback(new Promise(() => undefined), 50, 'fallback', 'slow');
    const advance = vi.advanceTimersByTimeAsync(60);
    await advance;
    await expect(pending).resolves.toBe('fallback');
    vi.useRealTimers();
  });
});
