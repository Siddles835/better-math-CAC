import fs from 'fs';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import {
  beginCheck,
  canCheck,
  finishCheck,
  initialAnswerCheck,
  markChanged,
} from './answerCheck';
import { appendDiagnosisSnapshot, DIAGNOSIS_HISTORY_CAP } from './cognition/history';
import { buildClassBriefing } from './cognition/briefing';
import { diagnoseFeatures, diagnoseTrace } from './cognition/diagnose';
import { readDrawing } from './cognition/digitModel';
import { extractFeatures } from './cognition/features';
import { rasterizeStrokes } from './cognition/strokes';
import { segmentIntoDigits } from './cognition/segment';
import { LessonTrace } from './cognition/trace';
import { buildClassTrend, resolvedStudents } from './cognition/trends';
import { FEATURE_ORDER, type CognitionFeatures, type MisconceptionCode } from './cognition/types';
import { walkTree } from './cognition/walkTree';
import tree from './cognition/models/misconception_tree.json';
import evalJson from './cognition/models/eval.json';
import { READING_TIME_MULTIPLIER, APP_LANGS } from './cognition/readingTime';
import { detectLanguage, formatNumberDisplay, pluralSuffix } from './i18n/language';
import { normalizeSpeechText } from './speech';
import type { PlanetId } from './planets';
import { PLANET_ORDER } from './planets';
import type { StudentState } from './classroom';
import type { DiagnosisSnapshot } from './cognition/history';
import lessonsEn from '../locales/en/lessons.json';

const snap = (at: number, primary: MisconceptionCode, planet: PlanetId = 'sun'): DiagnosisSnapshot => ({
  at,
  planet,
  primary,
  confidence: 0.8,
});

const student = (nickname: string, history?: DiagnosisSnapshot[], primary?: MisconceptionCode): StudentState => ({
  nickname,
  planet: 'sun',
  lesson: 'counting',
  lastUpdated: 1,
  diagnosisHistory: history,
  lastDiagnosis: primary
    ? {
        primary,
        confidence: 0.8,
        scores: [],
        glowPlanets: ['sun'],
        nextPlanet: 'mercury',
        kidLine: 'keep going',
        teacherLine: 'practice',
        earlyWarning: null,
        updatedAt: 1,
      }
    : undefined,
});

describe('answer checks', () => {
  it('lets a wrong answer be changed and checked again, and locks a success', () => {
    let state = initialAnswerCheck();
    expect(canCheck(state, true)).toBe(true);
    state = finishCheck(beginCheck(state, true)!, 'incorrect');
    expect(state.wrongAttempts).toBe(1);
    expect(canCheck(state, true)).toBe(false);
    state = markChanged(state);
    expect(state.verdict).toBeNull();
    expect(canCheck(state, true)).toBe(true);
    state = finishCheck(beginCheck(state, true)!, 'correct');
    const locked = markChanged(state);
    expect(locked.lockedSuccess).toBe(true);
    expect(locked.verdict).toBe('correct');
    expect(beginCheck(locked, true)).toBeNull();
  });

  it('does not count an unreadable drawing as a wrong attempt', () => {
    const state = finishCheck(beginCheck(initialAnswerCheck(), true)!, 'unreadable');
    expect(state.wrongAttempts).toBe(0);
    expect(state.unreadableStreak).toBe(1);
    expect(state.verdict).toBe('unreadable');
  });

  it('ignores a second tap while a check is in flight', () => {
    const started = beginCheck(initialAnswerCheck(), true)!;
    expect(beginCheck(started, true)).toBeNull();
  });
});

describe('reveal prevention', () => {
  it('wrong-answer hints do not contain a target number', () => {
    const hints = [lessonsEn.tooSmall, lessonsEn.tooFew, lessonsEn.oneAtATime, lessonsEn.countAgain, lessonsEn.tryAdding, lessonsEn.lookStory, lessonsEn.sunPrompt, lessonsEn.earthPrompt];
    for (const hint of hints) {
      expect(hint).not.toMatch(/\d/);
      expect(hint.toLowerCase()).not.toContain('the answer is');
    }
  });
});

describe('diagnosis history', () => {
  it('caps history at 40 and drops the oldest', () => {
    let history: DiagnosisSnapshot[] = [];
    for (let i = 0; i < 45; i += 1) {
      history = appendDiagnosisSnapshot(history, snap(i * 120_000, i % 2 === 0 ? 'STEADY' : 'COUNT_ALL'));
    }
    expect(history).toHaveLength(DIAGNOSIS_HISTORY_CAP);
    expect(history[0].at).toBe(5 * 120_000);
  });

  it('suppresses the same diagnosis saved twice within 60 seconds', () => {
    const first = appendDiagnosisSnapshot(undefined, snap(1_000, 'COUNT_ALL', 'mercury'));
    const again = appendDiagnosisSnapshot(first, snap(30_000, 'COUNT_ALL', 'mercury'));
    expect(again).toHaveLength(1);
    const later = appendDiagnosisSnapshot(again, snap(70_000, 'COUNT_ALL', 'mercury'));
    expect(later).toHaveLength(2);
  });

  it('treats a missing history as empty', () => {
    const next = appendDiagnosisSnapshot(undefined, snap(10, 'STEADY'));
    expect(next).toHaveLength(1);
  });
});

describe('trends', () => {
  const month = new Date(2026, 9, 15).getTime();

  it('resolves only after two steady snapshots this month', () => {
    const flag = snap(new Date(2026, 9, 1).getTime(), 'COUNT_ALL');
    const steady1 = snap(new Date(2026, 9, 8).getTime(), 'STEADY');
    const steady2 = snap(new Date(2026, 9, 12).getTime(), 'STEADY');
    const found = resolvedStudents([student('Quiet', [flag, steady1, steady2])], month);
    expect(found.map((row) => row.nickname)).toEqual(['Quiet']);
    expect(resolvedStudents([student('OnlySteady', [steady1, steady2, snap(new Date(2026, 9, 13).getTime(), 'STEADY')])], month)).toEqual([]);
    expect(resolvedStudents([student('OneSteady', [flag, steady1])], month)).toEqual([]);
    expect(resolvedStudents([student('Broke', [flag, steady1, steady2, snap(new Date(2026, 9, 14).getTime(), 'DIGIT_REV')])], month)).toEqual([]);
    const old = resolvedStudents(
      [student('LastMonth', [
        snap(new Date(2026, 8, 1).getTime(), 'COUNT_ALL'),
        snap(new Date(2026, 8, 8).getTime(), 'STEADY'),
        snap(new Date(2026, 8, 12).getTime(), 'STEADY'),
      ])],
      month
    );
    expect(old).toEqual([]);
  });

  it('carries the previous diagnosis into an empty week', () => {
    const start = new Date(2026, 0, 5).getTime();
    const week = 7 * 24 * 60 * 60 * 1000;
    const history = [snap(start, 'COUNT_ALL'), snap(start + 3 * week, 'STEADY')];
    const trend = buildClassTrend([student('A', history)], start + 3 * week);
    expect(trend.enough).toBe(true);
    expect(trend.unit).toBe('week');
    const carried = trend.buckets.filter((bucket) => bucket.carried > 0);
    expect(carried.length).toBeGreaterThan(0);
    expect(carried.some((bucket) => bucket.counts.COUNT_ALL === 1)).toBe(true);
  });

  it('stays empty with no history', () => {
    const trend = buildClassTrend([student('A')], Date.now());
    expect(trend.enough).toBe(false);
    expect(trend.buckets).toEqual([]);
  });
});

describe('briefing without history', () => {
  it('uses lastDiagnosis and ignores a missing history field', () => {
    const briefing = buildClassBriefing([
      student('A', undefined, 'COUNT_ALL'),
      student('B', undefined, 'STEADY'),
    ]);
    expect(briefing.total).toBe(2);
    expect(briefing.needsAttention).toBe(1);
    expect(briefing.actions[0].students).toEqual(['A']);
  });
});

describe('drawing', () => {
  it('matches the Python golden rasters', () => {
    const golden = JSON.parse(fs.readFileSync(path.resolve('ml/golden_rasters.json'), 'utf8')) as Array<{
      strokes: number[][][];
      grid: number[];
    }>;
    for (const item of golden) {
      const strokes = item.strokes.map((stroke) => stroke.map(([x, y]) => ({ x, y })));
      const got = rasterizeStrokes(strokes).map((value) => Math.round(value * 100000) / 100000);
      const expected = item.grid.map((value) => Math.round(value * 100000) / 100000);
      expect(got).toEqual(expected);
    }
  });

  it('reads 10, 12, and 14 as two digits and does not split one digit', () => {
    const samples = JSON.parse(fs.readFileSync(path.resolve('src/lib/cognition/models/digit_samples.json'), 'utf8')) as Array<{
      value: number;
      strokes: number[][][];
    }>;
    for (const sample of samples) {
      const strokes = sample.strokes.map((stroke) => stroke.map(([x, y]) => ({ x, y })));
      const groups = segmentIntoDigits(strokes);
      expect(groups.tooMany).toBe(false);
      expect(groups.groups).toHaveLength(2);
      const read = readDrawing(strokes);
      expect(read.status).toBe('ok');
      expect(read.digit).toBe(sample.value);
    }
    const single = segmentIntoDigits([[{ x: 10, y: 10 }, { x: 10, y: 80 }, { x: 40, y: 80 }]]);
    expect(single.groups).toHaveLength(1);
  });

  it('rejects a tiny mark and does not store it as an error', () => {
    const read = readDrawing([[{ x: 4, y: 4 }, { x: 6, y: 5 }]]);
    expect(read.status).toBe('unreadable');
    const trace = new LessonTrace();
    trace.setDigit(read, 7);
    expect(trace.events).toHaveLength(0);
    expect(trace.digit).toBeNull();
    const features = extractFeatures('sun', trace, 'en');
    expect(features.drawReversal).toBe(0);
  });
});

describe('models', () => {
  it('classifies each canonical example and keeps probabilities near 1', () => {
    const examples = evalJson.misconceptionTree.canonicalExamples as Record<string, Record<string, number>>;
    for (const [code, row] of Object.entries(examples)) {
      const features = {} as Record<keyof CognitionFeatures, number>;
      for (const key of FEATURE_ORDER) features[key] = row[key];
      const planet = PLANET_ORDER[features.planetIndex] ?? 'sun';
      expect(diagnoseFeatures(planet, features as CognitionFeatures).primary).toBe(code);
      const walked = walkTree(tree, FEATURE_ORDER.map((key) => features[key]));
      const sum = Object.values(walked.shares).reduce((total, value) => total + value, 0);
      expect(sum).toBeGreaterThan(0.99);
      expect(sum).toBeLessThan(1.01);
    }
  });

  it('has confusion-matrix row sums that match supports', () => {
    const matrix = evalJson.misconceptionTree.confusionMatrix;
    const perClass = evalJson.misconceptionTree.perClass;
    matrix.matrix.forEach((row, index) => {
      const sum = row.reduce((total, value) => total + value, 0);
      expect(sum).toBe(perClass[index].support);
    });
    expect(evalJson.dataSource).toBe('synthetic');
    expect(evalJson.misconceptionTree.perLanguage.en.macroF1).toEqual(expect.any(Number));
    expect(evalJson.digitModel.perScript.western.accuracy).toEqual(expect.any(Number));
  });
});

describe('language and speech', () => {
  it('maps device languages', () => {
    expect(detectLanguage(['zh-CN', 'en'])).toBe('zh-Hans');
    expect(detectLanguage(['hi-IN'])).toBe('hi');
    expect(detectLanguage(['es-MX'])).toBe('es');
    expect(detectLanguage(['ar-SA'])).toBe('ar');
    expect(detectLanguage(['fr-FR', 'en-US'])).toBe('en');
  });

  it('converts display digits without changing the stored value', () => {
    expect(formatNumberDisplay(8, 'western')).toBe('8');
    expect(formatNumberDisplay(83, 'eastern')).toBe('٨٣');
    expect(formatNumberDisplay('14', 'devanagari')).toBe('१४');
  });

  it('selects plural categories', () => {
    expect(pluralSuffix('en', 1)).toBe('one');
    expect(pluralSuffix('es', 3)).toBe('other');
    expect(pluralSuffix('zh-Hans', 1)).toBe('other');
    expect(pluralSuffix('ar', 0)).toBe('zero');
    expect(pluralSuffix('ar', 2)).toBe('two');
    expect(pluralSuffix('ar', 5)).toBe('few');
    expect(pluralSuffix('hi', 1)).toBe('one');
  });

  it('normalizes 8 - 3 in every language', () => {
    expect(normalizeSpeechText('8 - 3', 'zh-Hans')).toBe('八减三');
    expect(normalizeSpeechText('8 - 3', 'ar')).toBe('ثمانية ناقص ثلاثة');
    expect(normalizeSpeechText('8 - 3', 'hi')).toBe('आठ में से तीन घटाओ');
    expect(normalizeSpeechText('8 - 3', 'es')).toBe('ocho menos tres');
    expect(normalizeSpeechText('8 - 3', 'en')).toBe('eight minus three');
  });

  it('gives the same diagnosis after reading-time normalization', () => {
    const diagnoses = APP_LANGS.map((lang) => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000_000);
      const trace = new LessonTrace();
      const scale = READING_TIME_MULTIPLIER[lang];
      vi.setSystemTime(1_000_000 + Math.round(2.4 * scale * 1000));
      trace.tap(3, 3);
      vi.setSystemTime(1_000_000 + Math.round((2.4 + 0.8) * scale * 1000));
      trace.tap(3, 3);
      trace.check(3, 3);
      const features = extractFeatures('earth', trace, lang);
      const diagnosis = diagnoseTrace('earth', trace, lang).primary;
      vi.useRealTimers();
      return { lang, timeToFirst: features.timeToFirst, avgGap: features.avgGap, diagnosis };
    });
    const first = diagnoses[0];
    for (const row of diagnoses) {
      expect(row.timeToFirst).toBe(first.timeToFirst);
      expect(row.avgGap).toBe(first.avgGap);
      expect(row.diagnosis).toBe(first.diagnosis);
    }
  });
});
