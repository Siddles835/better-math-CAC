import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n/setup';
import {
  buildAssessmentResultView,
  humanizeSlug,
  labelForBandId,
  labelTopic,
} from './assessmentLabels';
import type { AssessmentSummary } from '@/content/types';

describe('assessmentLabels', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('humanizes raw slugs', () => {
    expect(humanizeSlug('algebra-band-2')).toBe('Algebra Band 2');
    expect(humanizeSlug('sub20')).toBe('Sub20');
  });

  it('labels topics with real words', () => {
    expect(labelTopic('counting')).toBe('Counting');
    expect(labelTopic('algebra')).toBe('Algebra');
  });

  it('labels foundation and generated bands without raw ids', () => {
    expect(labelForBandId('sub20')).toMatch(/Uranus/i);
    expect(labelForBandId('addition-band-3')).toMatch(/Larger sums/i);
    expect(labelForBandId('algebra-band-2')).toMatch(/Balance/i);
    expect(labelForBandId(null)).toMatch(/not checked/i);
  });

  it('builds a result view with friendly recommendation copy parts', () => {
    const summary: AssessmentSummary = {
      id: 'assess-1',
      at: 1,
      recommendedPathId: 'algebra',
      recommendedNodeId: 'algebra-2',
      clearedIndex: 10,
      byPath: {
        foundations: { clearedBandId: 'sub20', topics: {} },
        algebra: { clearedBandId: 'algebra-band-2', topics: {} },
        geometry: { clearedBandId: null, topics: {} },
      },
      strengths: ['counting', 'addition', 'algebra'],
      practiceTopics: ['algebra'],
    };
    const view = buildAssessmentResultView(summary);
    expect(view.pathTitle).toBe('Algebra');
    expect(view.stepTitle).toMatch(/Balance/i);
    expect(view.strengths).toContain('Counting');
    expect(view.strengths.every((item) => !item.includes('-'))).toBe(true);
    expect(view.pathRows.find((row) => row.pathId === 'foundations')?.stepTitle).toMatch(/Uranus/i);
    expect(view.pathRows.find((row) => row.pathId === 'algebra')?.stepTitle).toMatch(/Balance/i);
    expect(view.pathRows.find((row) => row.pathId === 'geometry')?.checked).toBe(false);
  });
});
