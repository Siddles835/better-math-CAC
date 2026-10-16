import { describe, expect, it } from 'vitest';
import { hasUndefined, stripUndefined } from './stripUndefined';

describe('stripUndefined', () => {
  it('removes undefined keys and array holes, keeps null and numbers', () => {
    const input = {
      a: 1,
      b: undefined,
      c: null,
      d: { e: undefined, f: 'ok', g: [1, undefined, null] },
    };
    expect(stripUndefined(input)).toEqual({
      a: 1,
      c: null,
      d: { f: 'ok', g: [1, null] },
    });
  });

  it('deep-checks for undefined on hydrated-like payloads', () => {
    const bad = { workedExample: undefined, prompt: 'hi' };
    expect(hasUndefined(bad)).toBe(true);
    expect(hasUndefined(stripUndefined(bad))).toBe(false);
    expect(stripUndefined(bad)).toEqual({ prompt: 'hi' });
  });
});
