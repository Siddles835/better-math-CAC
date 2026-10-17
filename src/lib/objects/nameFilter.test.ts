import { describe, expect, it } from 'vitest';
import { checkObjectName, guessMany } from './nameFilter';

describe('checkObjectName', () => {
  it('accepts ordinary object names and rejects unsafe ones', () => {
    expect(checkObjectName('pencil').ok).toBe(true);
    expect(checkObjectName('').reason).toBe('required');
    expect(checkObjectName('a'.repeat(25)).reason).toBe('length');
    expect(checkObjectName('crayon4').reason).toBe('digits');
    expect(checkObjectName('mom').reason).toBe('person');
  });
});

describe('guessMany', () => {
  it('pluralizes en and es only', () => {
    expect(guessMany('pencil', 'en')).toBe('pencils');
    expect(guessMany('box', 'en')).toBe('boxes');
    expect(guessMany('crayon', 'es')).toBe('crayones');
    expect(guessMany('manzana', 'es')).toBe('manzanas');
    expect(guessMany('铅笔', 'zh-Hans')).toBe('铅笔');
    expect(guessMany('قلم', 'ar')).toBe('قلم');
  });
});
