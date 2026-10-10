import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PATHS, getPath } from '@/content/catalog';
import { duplicatePath, resolveAssignment, afterCurriculumDelete, validateCurriculum } from '@/lib/curriculum/logic';
import { PATH_GENERATOR_IDS, auditItem, generatePathItem } from '@/lib/paths/generators';
import {
  addTimeSeconds,
  appendAssessment,
  emptyLearner,
  emptyPathProgress,
  isNodeUnlocked,
  learnerFromLegacy,
  recordAttempt,
  switchPath,
} from '@/lib/paths/progress';
import { leaksAnswer } from '@/lib/paths/text';
import { bandsForPath, runBandStaircase, skippedAssessment } from '@/lib/placementBands';
import { csvCell, csvFilename, formatCsvNumber, toCsv } from '@/lib/reporting/csv';
import { IDLE_MS, localDayKey, nextTimeSample } from '@/lib/reporting/time';
import { runAudit } from '@/lib/answers/audit';
import { THEME_TOKENS, contrastRatio, themePairs } from '@/lib/theme/contrast';
import type { Assignment } from '@/content/types';
import { ASSESSMENT_CAP, TIME_DAY_CAP } from '@/content/types';

const LOCALES = ['en', 'zh-Hans', 'hi', 'es', 'ar'] as const;
const SEEDS = 5000;

const loadPaths = (locale: string): Record<string, string> =>
  JSON.parse(fs.readFileSync(path.resolve(process.cwd(), `src/locales/${locale}/paths.json`), 'utf8')) as Record<string, string>;

describe('paths and curricula', () => {
  it('unlocks nodes in order and keeps progress when switching paths', () => {
    const addition = getPath('addition');
    expect(addition).toBeTruthy();
    if (!addition) return;
    let progress = emptyPathProgress(addition);
    expect(isNodeUnlocked(addition, progress, addition.nodes[0].id)).toBe(true);
    expect(isNodeUnlocked(addition, progress, addition.nodes[1].id)).toBe(false);
    const first = addition.nodes[0];
    for (let i = 0; i < 4; i += 1) {
      progress = recordAttempt(progress, first.id, first.topics, true, 80, 3);
    }
    expect(progress.nodeMastery[first.id]?.mastered).toBe(true);
    expect(isNodeUnlocked(addition, progress, addition.nodes[1].id)).toBe(true);

    let record = emptyLearner('foundations');
    record = switchPath(record, 'addition');
    record = {
      ...record,
      paths: { ...record.paths, addition: progress },
    };
    record = switchPath(record, 'multiplication');
    expect(record.activePathId).toBe('multiplication');
    expect(record.paths.addition.completedNodeIds).toEqual(progress.completedNodeIds);
    record = switchPath(record, 'addition');
    expect(record.paths.addition.nodeMastery[first.id]?.mastered).toBe(true);
    expect(record.paths.multiplication).toBeTruthy();
  });

  it('generalizes the staircase for all-correct, all-wrong, skip, and termination', () => {
    const bands = bandsForPath('multiplication');
    expect(bands.length).toBeGreaterThanOrEqual(3);
    const correct = runBandStaircase(bands.length, ['correct']);
    expect(correct.done).toBe(true);
    expect(correct.clearedLevelIndex).toBe(bands.length - 1);
    expect(correct.itemsAnswered).toBeGreaterThanOrEqual(12);
    expect(correct.itemsAnswered).toBeLessThanOrEqual(Math.max(16, bands.length * 2));

    const wrong = runBandStaircase(bands.length, ['incorrect']);
    expect(wrong.done).toBe(true);
    expect(wrong.clearedLevelIndex).toBe(-1);
    expect(wrong.itemsAnswered).toBeGreaterThanOrEqual(12);

    const skipped = skippedAssessment(1);
    expect(skipped.clearedIndex).toBe(-1);
    expect(skipped.recommendedPathId).toBe('foundations');
    expect(skipped.recommendedNodeId).toBe('sun');

    const stalled = runBandStaircase(bands.length, ['unreadable']);
    expect(stalled.itemsAnswered).toBe(0);
    expect(stalled.done).toBe(false);
  });

  it('lets a student assignment beat the class, and ignores solo learners', () => {
    const older: Assignment = {
      id: 'class-old',
      curriculumId: 'class-curr',
      scope: { kind: 'class' },
      mode: 'alongside',
      updatedAt: 10,
    };
    const newer: Assignment = {
      id: 'class-new',
      curriculumId: 'newer-curr',
      scope: { kind: 'class' },
      mode: 'alongside',
      updatedAt: 20,
    };
    const student: Assignment = {
      id: 'student',
      curriculumId: 'student-curr',
      scope: { kind: 'student', studentKey: 'nova' },
      mode: 'replace',
      updatedAt: 5,
    };
    expect(resolveAssignment([older, newer], 'nova', false)?.curriculumId).toBe('newer-curr');
    expect(resolveAssignment([older, newer, student], 'nova', false)?.curriculumId).toBe('student-curr');
    expect(resolveAssignment([older, newer, student], 'other', false)?.curriculumId).toBe('newer-curr');
    expect(resolveAssignment([older, student], 'nova', true)).toBeNull();
  });

  it('falls back to the active path when an assigned curriculum is deleted', () => {
    const record = switchPath(emptyLearner('foundations'), 'geometry');
    record.paths.geometry = emptyPathProgress(getPath('geometry')!);
    const assignments: Assignment[] = [
      {
        id: 'keep',
        curriculumId: 'other',
        scope: { kind: 'class' },
        mode: 'alongside',
        updatedAt: 1,
      },
      {
        id: 'drop',
        curriculumId: 'gone',
        scope: { kind: 'student', studentKey: 'nova' },
        mode: 'replace',
        updatedAt: 2,
      },
    ];
    const next = afterCurriculumDelete(record, assignments, 'gone');
    expect(next.record).toBe(record);
    expect(next.assignments.map((item) => item.id)).toEqual(['keep']);
    expect(next.fallbackPathId).toBe('geometry');
    expect(next.record.paths.geometry.currentNodeId).toBe(record.paths.geometry.currentNodeId);
  });

  it('freezes a duplicated path into concrete problems and validates', () => {
    const addition = getPath('addition')!;
    const curriculum = duplicatePath(addition, 'demo', 'dup', 'Smaller steps');
    expect(curriculum.nodes.length).toBe(addition.nodes.length);
    for (const node of curriculum.nodes) {
      expect(node.source.kind).toBe('authored');
      expect(node.source.problems.length).toBeGreaterThanOrEqual(3);
      expect(node.source.problems.every((problem) => problem.answer.length > 0)).toBe(true);
    }
    const again = duplicatePath(addition, 'demo', 'dup', 'Smaller steps');
    expect(again.nodes.map((node) => node.source.problems.map((problem) => problem.answer))).toEqual(
      curriculum.nodes.map((node) => node.source.problems.map((problem) => problem.answer))
    );
    expect(validateCurriculum({ ...curriculum, name: '' })).toContain('name');
    expect(validateCurriculum(curriculum)).toEqual([]);
  });

  it('is deterministic for every new generator', () => {
    for (const id of PATH_GENERATOR_IDS) {
      const first = generatePathItem(id, 2, 4242);
      const second = generatePathItem(id, 2, 4242);
      expect(second).toEqual(first);
      expect(first.problem.answer).toBe(String(first.audit.expectedAnswer));
    }
  });

  it('reads an old student document as Foundations progress', () => {
    const record = learnerFromLegacy({
      planet: 'mars',
      completedPlanets: ['sun', 'mercury', 'venus', 'earth'],
    });
    expect(record.activePathId).toBe('foundations');
    expect(record.assessments).toEqual([]);
    expect(record.paths.foundations.currentNodeId).toBe('mars');
    expect(record.paths.foundations.completedNodeIds).toContain('sun');
    expect(record.paths.foundations.nodeMastery.earth?.mastered).toBe(true);
    const bare = learnerFromLegacy({});
    expect(bare.activePathId).toBe('foundations');
    expect(bare.paths.foundations.currentNodeId).toBe('sun');
  });

  it('caps assessment history and daily time', () => {
    let record = emptyLearner();
    for (let i = 0; i < 20; i += 1) {
      record = appendAssessment(record, skippedAssessment(i));
    }
    expect(record.assessments).toHaveLength(ASSESSMENT_CAP);
    expect(record.assessments[0].at).toBe(8);
    for (let day = 0; day < TIME_DAY_CAP + 5; day += 1) {
      record = addTimeSeconds(record, `2026-01-${String(day + 1).padStart(2, '0')}`, 3);
    }
    expect(Object.keys(record.timeByDay)).toHaveLength(TIME_DAY_CAP);
  });
});

describe('path generator audit', () => {
  it.each(PATH_GENERATOR_IDS)('audits %s across 5000 seeds', (id) => {
    const questions = [];
    for (let seed = 0; seed < SEEDS; seed += 1) questions.push(auditItem(id, seed));
    const result = runAudit(questions);
    if (result.violations.length) {
      console.log(JSON.stringify(result.violations.slice(0, 8), null, 2));
    }
    expect(result.violations).toEqual([]);
  });
});

describe('pilot csv and time', () => {
  it('escapes formulas, prefixes a BOM, and keeps numbers locale-independent', () => {
    expect(formatCsvNumber(1.239)).toBe('1.24');
    expect(formatCsvNumber(1000)).toBe('1000');
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell('@sum')).toBe("'@sum");
    expect(csvCell('a,b')).toBe('"a,b"');
    const csv = toCsv([['=cmd', 'space name', 1.5]]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain("'=cmd");
    expect(csvFilename(true)).toBe('DEMO-mathlift-export.csv');
    expect(csvFilename(false)).toBe('mathlift-export.csv');
  });

  it('counts foreground seconds and stops after the idle cutoff', () => {
    expect(IDLE_MS).toBe(60_000);
    const moving = nextTimeSample({ cursor: 1_000, lastInput: 1_000 }, 31_000, true);
    expect(moving.deltaMs).toBe(30_000);
    const idle = nextTimeSample({ cursor: 1_000, lastInput: 1_000 }, 1_000 + 90_000, true);
    expect(idle.deltaMs).toBe(60_000);
    const hidden = nextTimeSample({ cursor: 1_000, lastInput: 1_000 }, 20_000, false);
    expect(hidden.deltaMs).toBe(0);
    expect(localDayKey(new Date(2026, 9, 10, 23, 59, 0))).toBe('2026-10-10');
  });
});

describe('appearance contrast', () => {
  it('meets WCAG AA for text pairs in light, dark, and contrast', () => {
    for (const name of ['light', 'dark', 'contrast'] as const) {
      for (const [label, a, b] of themePairs(THEME_TOKENS[name])) {
        expect(contrastRatio(a, b), `${name} ${label}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('path locales', () => {
  it('has the same keys and placeholders in every language', () => {
    const english = loadPaths('en');
    const englishKeys = Object.keys(english).sort();
    for (const locale of LOCALES) {
      const messages = loadPaths(locale);
      expect(Object.keys(messages).sort()).toEqual(englishKeys);
      for (const key of englishKeys) {
        const source = english[key].match(/\{\{[^}]+\}\}/g) ?? [];
        const translated = messages[key].match(/\{\{[^}]+\}\}/g) ?? [];
        expect(translated.sort()).toEqual(source.sort());
        if (locale !== 'en') expect(messages[key]).not.toBe(english[key]);
      }
    }
  });

  it('does not leak numeric answers in hints or feedback', () => {
    const feedback = new Set(['playCorrect', 'playNotYet', 'playUnreadable', 'playMore']);
    for (const locale of LOCALES) {
      const messages = loadPaths(locale);
      for (const [key, value] of Object.entries(messages)) {
        if (!key.startsWith('hint_') && !feedback.has(key)) continue;
        expect(value, `${locale}:${key}`).not.toMatch(/\d/);
        expect(leaksAnswer([value], '8')).toBe(false);
      }
    }
    expect(PATHS.length).toBe(7);
  });
});
