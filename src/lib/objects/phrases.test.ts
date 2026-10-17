import { describe, expect, it } from 'vitest';
import { objectPhrase } from './phrases';
import type { AppLang } from '@/lib/i18n/language';

const names = { one: 'crayon', many: 'crayons' };
const langs: AppLang[] = ['en', 'es', 'zh-Hans', 'hi', 'ar'];
const counts = [0, 1, 2, 3, 10, 11, 20];

describe('objectPhrase', () => {
  it('builds count/add/subtract lines for every language and count', () => {
    for (const lang of langs) {
      for (const n of counts) {
        const count = objectPhrase('count', lang, n, names);
        const add = objectPhrase('add', lang, n, names, 2);
        const sub = objectPhrase('subtract', lang, n, names, 1);
        expect(count.length).toBeGreaterThan(5);
        expect(add.length).toBeGreaterThan(5);
        expect(sub.length).toBeGreaterThan(5);
        expect(count).not.toMatch(/\{\{/);
        if (lang === 'en' && n === 1) expect(count).toContain('crayon');
        if (lang === 'en' && n !== 1) expect(count).toContain('crayons');
      }
    }
  });
});
