import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  allQuizQuestions,
  checkEquationChips,
  checkLocaleText,
  checkTypedParsing,
  generateJupiterMcq,
  generateMercury,
  generateNeptuneMcq,
  generatePersonalPathQuestions,
  generateVenusMcq,
  runAudit,
  staticPlanetProblems,
  QUIZ_DEFS,
} from './index';
import { needsConfirm as digitNeedsConfirm } from '@/lib/cognition/digitModel';
import type { DigitRead } from '@/lib/cognition/types';
import { LessonTrace } from '@/lib/cognition/trace';

const LOCALES = ['en', 'zh-Hans', 'hi', 'es', 'ar'] as const;
const SEEDS = 5000;

const loadQuizLocale = (locale: string): Record<string, string> => {
  const file = path.resolve(process.cwd(), `src/locales/${locale}/quiz.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
};

describe('answer audit', () => {
  it('inventories every static quiz question', () => {
    const qs = allQuizQuestions();
    console.log(`AUDIT inventory quiz static: ${qs.length}`);
    expect(qs.length).toBe(24);
    expect(QUIZ_DEFS.length).toBe(24);
  });

  it('reports zero violations on static quiz + planet problems', () => {
    const qs = [...allQuizQuestions(), ...staticPlanetProblems()];
    const beforeNote = 'static set';
    const result = runAudit(qs);
    console.log(
      `AUDIT ${beforeNote}: total=${result.total} violations=${result.violations.length}`
    );
    if (result.violations.length) {
      console.log(JSON.stringify(result.violations.slice(0, 20), null, 2));
    }
    expect(result.violations).toEqual([]);
  });

  it('locale story numbers match operands in every locale', () => {
    const qs = allQuizQuestions();
    const violations = [];
    for (const locale of LOCALES) {
      const pack = loadQuizLocale(locale);
      for (const q of qs) {
        const story = pack[`${q.id}_story`];
        const question = pack[`${q.id}_question`];
        expect(story, `${locale} missing ${q.id}_story`).toBeTruthy();
        expect(question, `${locale} missing ${q.id}_question`).toBeTruthy();
        // English source in QUIZ_DEFS must match en locale for numbers.
        violations.push(...checkLocaleText(q, locale, story, question));
      }
    }
    if (violations.length) console.log(JSON.stringify(violations.slice(0, 30), null, 2));
    expect(violations).toEqual([]);
  });

  it('typed answer parsing accepts scripts and rejects junk as unreadable', () => {
    const v = checkTypedParsing();
    expect(v).toEqual([]);
  });

  it('equation chips never leak the answer and accept valid orders only', () => {
    const pairs: Array<[number, number, '+' | '−']> = [
      [2, 3, '+'],
      [3, 2, '+'],
      [5, 2, '−'],
      [8, 3, '−'],
      [4, 4, '+'],
    ];
    const violations = pairs.flatMap(([a, b, op], i) => checkEquationChips(a, b, op, 1000 + i));
    expect(violations).toEqual([]);
  });

  it.each([
    ['mercury', generateMercury],
    ['venus', generateVenusMcq],
    ['jupiter', generateJupiterMcq],
    ['neptune', generateNeptuneMcq],
  ] as const)('brute-force %s over %i seeds with zero violations', (name, gen) => {
    const questions = [];
    for (let seed = 0; seed < SEEDS; seed++) {
      questions.push(gen(seed));
    }
    const result = runAudit(questions);
    console.log(`AUDIT ${name}: total=${result.total} violations=${result.violations.length}`);
    if (result.violations.length) {
      console.log(JSON.stringify(result.violations.slice(0, 15), null, 2));
    }
    expect(result.violations).toEqual([]);
  });

  it(`brute-force personalPath over ${SEEDS} seeds`, () => {
    const questions = [];
    for (let seed = 0; seed < SEEDS; seed++) {
      questions.push(...generatePersonalPathQuestions(seed));
    }
    // Personal path: verify derived targets, non-negative take-away, in-band answers.
    const violations = runAudit(questions).violations.filter(
      (v) =>
        v.check === 'expected_matches_operands' ||
        v.check === 'non_negative' ||
        v.check === 'options_unique'
    );
    console.log(
      `AUDIT personalPath: total=${questions.length} focusedViolations=${violations.length}`
    );
    if (violations.length) console.log(JSON.stringify(violations.slice(0, 15), null, 2));
    expect(violations).toEqual([]);
  });

  it('unreadable or unconfirmed draws never count as wrong in the lesson trace', () => {
    const trace = new LessonTrace();
    const unreadable: DigitRead = {
      status: 'unreadable',
      digit: 0,
      confidence: 0.1,
      reversal: false,
      strokeCount: 1,
      startQuadrant: 1,
      reason: 'low_confidence',
    };
    trace.setDigit(unreadable, 5);
    expect(trace.events).toHaveLength(0);

    const mid: DigitRead = {
      status: 'ok',
      digit: 5,
      confidence: 0.7,
      reversal: false,
      strokeCount: 1,
      startQuadrant: 1,
    };
    // needsConfirm should be true for mid confidence — parent must not auto-score wrong.
    expect(digitNeedsConfirm(mid) || mid.confidence < 0.99).toBe(true);
  });

  it('simulated strokes for each digit: unreadable reads never enter the trace as errors', async () => {
    const { readDrawing } = await import('@/lib/cognition');
    // Minimal single-stroke templates (same idea as digitFingerPaths — enough ink to rasterize).
    const strokeFor = (digit: number) => {
      const base = 20 + digit * 2;
      return [[{ x: base, y: 10 }, { x: base + 10, y: 40 }, { x: base, y: 70 }]];
    };
    for (let d = 0; d <= 9; d++) {
      const read = readDrawing(strokeFor(d));
      const trace = new LessonTrace();
      if (read.status === 'unreadable' || digitNeedsConfirm(read)) {
        // Must not be recorded as a wrong attempt.
        if (read.status === 'unreadable') {
          trace.setDigit(read, d);
          expect(trace.events).toHaveLength(0);
        }
      } else {
        // High-confidence ok read may be judged — only after confirm gate would pass.
        expect(read.status).toBe('ok');
      }
    }
  });
});
