import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLANET_ORDER } from '@/lib/planets';
import { MAX_NUMBER } from '@/lib/lessonDuration';
import {
  TEACH_STORIES,
  getTeachStory,
  storyExpected,
  storyNumbersInRange,
} from './teachStories';

const LOCALES = ['en', 'zh-Hans', 'hi', 'es', 'ar'] as const;

const loadUi = (locale: string): Record<string, string> =>
  JSON.parse(fs.readFileSync(path.resolve(process.cwd(), `src/locales/${locale}/ui.json`), 'utf8'));

const placeholders = (text: string) =>
  [...text.matchAll(/\{\{[^}]+\}\}/g)].map((match) => match[0]).sort().join('|');

describe('teach stories', () => {
  it('has two different stories per planet within the number band', () => {
    for (const planet of PLANET_ORDER) {
      const a = getTeachStory(planet, 0);
      const b = getTeachStory(planet, 1);
      expect(a.lines.length).toBeGreaterThanOrEqual(3);
      expect(b.lines.length).toBeGreaterThanOrEqual(3);
      expect(a.lines.map((line) => line.key).join()).not.toBe(b.lines.map((line) => line.key).join());
      expect(JSON.stringify(a.operands)).not.toBe(JSON.stringify(b.operands));
      expect(storyNumbersInRange(a)).toBe(true);
      expect(storyNumbersInRange(b)).toBe(true);
      expect(storyExpected(a)).toBeLessThanOrEqual(MAX_NUMBER[planet]);
      expect(storyExpected(b)).toBeLessThanOrEqual(MAX_NUMBER[planet]);
      expect(storyExpected(a)).toBeGreaterThanOrEqual(0);
      expect(storyExpected(b)).toBeGreaterThanOrEqual(0);
    }
    expect(TEACH_STORIES).toHaveLength(18);
  });

  it('keeps narrated totals equal to the story data', () => {
    for (const story of TEACH_STORIES) {
      const expected = storyExpected(story);
      const totals = story.lines
        .map((line) => line.values.total)
        .filter((value): value is number => typeof value === 'number');
      expect(totals.length).toBeGreaterThan(0);
      for (const total of totals) expect(total).toBe(expected);
    }
  });

  it('has every line key in all locales with matching placeholders', () => {
    const keys = TEACH_STORIES.flatMap((story) => [
      story.titleKey.replace(/^ui:/, ''),
      ...story.lines.map((line) => line.key.replace(/^ui:/, '')),
      story.rememberKey.replace(/^ui:/, ''),
    ]);
    const english = loadUi('en');
    for (const locale of LOCALES) {
      const pack = loadUi(locale);
      for (const key of keys) {
        expect(pack[key], `${locale}:${key}`).toBeTruthy();
        expect(placeholders(pack[key])).toBe(placeholders(english[key]));
        if (locale !== 'en') expect(pack[key]).not.toBe(english[key]);
      }
    }
  });

  it('supplies every placeholder used by each English line', () => {
    const english = loadUi('en');
    for (const story of TEACH_STORIES) {
      for (const line of story.lines) {
        const key = line.key.replace(/^ui:/, '');
        const needed = [...english[key].matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
        for (const name of needed) {
          expect(line.values[name], `${line.key} missing {{${name}}}`).toEqual(expect.any(Number));
        }
      }
    }
  });
});
