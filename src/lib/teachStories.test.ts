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

const storyKeys = (story: (typeof TEACH_STORIES)[number]) => [
  story.titleKey.replace(/^ui:/, ''),
  ...story.narrations.map((line) => line.key.replace(/^ui:/, '')),
  story.action.promptKey.replace(/^ui:/, ''),
  story.rememberKey.replace(/^ui:/, ''),
];

describe('teach stories', () => {
  it('has two different interactive stories per planet within the number band', () => {
    for (const planet of PLANET_ORDER) {
      const a = getTeachStory(planet, 0);
      const b = getTeachStory(planet, 1);
      expect(a.narrations.length).toBeGreaterThanOrEqual(2);
      expect(b.narrations.length).toBeGreaterThanOrEqual(2);
      expect(a.action.kind).toBeTruthy();
      expect(b.action.kind).toBeTruthy();
      expect(a.narrations.map((line) => line.key).join()).not.toBe(b.narrations.map((line) => line.key).join());
      expect(JSON.stringify(a.operands)).not.toBe(JSON.stringify(b.operands));
      expect(a.action.target).toBe(storyExpected(a));
      expect(b.action.target).toBe(storyExpected(b));
      expect(storyNumbersInRange(a)).toBe(true);
      expect(storyNumbersInRange(b)).toBe(true);
      expect(storyExpected(a)).toBeLessThanOrEqual(MAX_NUMBER[planet]);
      expect(storyExpected(b)).toBeLessThanOrEqual(MAX_NUMBER[planet]);
      expect(storyExpected(a)).toBeGreaterThanOrEqual(0);
      expect(storyExpected(b)).toBeGreaterThanOrEqual(0);
    }
    expect(TEACH_STORIES).toHaveLength(18);
  });

  it('keeps action targets equal to the computed story answer', () => {
    for (const story of TEACH_STORIES) {
      expect(story.action.target).toBe(storyExpected(story));
    }
  });

  it('has every story key in all locales with matching placeholders', () => {
    const keys = TEACH_STORIES.flatMap(storyKeys);
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

  it('supplies every placeholder used by each English string', () => {
    const english = loadUi('en');
    for (const story of TEACH_STORIES) {
      for (const line of story.narrations) {
        const key = line.key.replace(/^ui:/, '');
        const needed = [...english[key].matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
        for (const name of needed) {
          expect(line.values[name], `${line.key} missing {{${name}}}`).toEqual(expect.any(Number));
        }
      }
      const promptKey = story.action.promptKey.replace(/^ui:/, '');
      const needed = [...english[promptKey].matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
      for (const name of needed) {
        expect(story.action.promptValues[name], `${story.action.promptKey} missing {{${name}}}`).toEqual(
          expect.any(Number)
        );
      }
    }
  });
});
