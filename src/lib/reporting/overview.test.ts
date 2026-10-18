import { describe, expect, it } from 'vitest';
import type { LearnerRecord } from '@/content/types';
import {
  classAverages,
  formatPercent,
  improvementOf,
  normalizeLearnerRecord,
  progressRatio,
  reportsToCsv,
  studentReport,
} from './overview';

const baseLearner = (overrides: Partial<LearnerRecord> = {}): LearnerRecord =>
  normalizeLearnerRecord({
    activePathId: 'foundations',
    paths: {
      foundations: {
        currentNodeId: 'sun',
        completedNodeIds: ['sun'],
        nodeMastery: { sun: { attempts: 4, correct: 3, mastered: false } },
        topicMastery: { counting: { correct: 3, attempts: 4 } },
      },
    },
    timeByDay: { '2026-01-01': 120 },
    assessments: [],
    curriculumProgress: {},
    ...overrides,
  } as LearnerRecord);

describe('pilot reporting', () => {
  it('normalizes incomplete learner docs without throwing', () => {
    const report = studentReport('Ada', { activePathId: 'foundations' } as LearnerRecord, null);
    expect(report.accuracy).toBe(0);
    expect(report.timeSeconds).toBe(0);
    expect(report.improvement).toBeNull();
  });

  it('does not invent improvement without two assessments', () => {
    expect(improvementOf([])).toBeNull();
    expect(improvementOf([{ clearedIndex: 2 } as never])).toBeNull();
    expect(
      improvementOf([
        { clearedIndex: 1, recommendedNodeId: 'a', at: 1 } as never,
        { clearedIndex: 4, recommendedNodeId: 'b', at: 2 } as never,
      ])
    ).toBe(3);
  });

  it('formats progress as percents and marks averages honestly', () => {
    const learner = baseLearner();
    const report = studentReport('Ada', learner, 'Class path');
    expect(formatPercent(report.accuracy)).toBe('75%');
    expect(progressRatio(learner)).toBeGreaterThan(0);
    const avg = classAverages([report], [progressRatio(learner)]);
    expect(avg.averageImprovement).toBeNull();
    expect(avg.students).toBe(1);
  });

  it('exports CSV with legacy flag and empty improvement when unknown', () => {
    const report = studentReport('Ada', baseLearner(), null, null, true);
    const csv = reportsToCsv([report]);
    expect(csv).toContain('space_name');
    expect(csv).toContain('legacy_only');
    expect(csv).toContain('Ada');
    expect(csv).toContain('1');
  });
});
