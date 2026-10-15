import { describe, expect, it } from 'vitest';
import { PATHS } from '@/content/catalog';
import { duplicatePath } from '@/lib/curriculum/logic';
import { hydrateCurriculum, looksLikeKey, nodeHasProblems } from './hydrate';

describe('hydrateCurriculum', () => {
  it('turns path keys into editable planet titles and prompts', () => {
    const addition = PATHS.find((path) => path.id === 'addition');
    expect(addition).toBeTruthy();
    const raw = duplicatePath(addition!, 'demo', 'dup', 'Addition copy');
    expect(looksLikeKey(raw.nodes[0]?.title) || raw.nodes[0]?.title?.startsWith('ui:')).toBe(true);
    const hydrated = hydrateCurriculum(raw);
    for (const node of hydrated.nodes) {
      expect(looksLikeKey(node.title)).toBe(false);
      expect(node.title.trim().length).toBeGreaterThan(0);
      expect(node.source.problems.length).toBeGreaterThanOrEqual(3);
      for (const problem of node.source.problems) {
        expect(problem.prompt?.trim().length).toBeGreaterThan(0);
        expect(problem.hints?.some((line) => line.trim().length > 0)).toBe(true);
      }
      expect(nodeHasProblems(node)).toBe(false);
    }
  });
});
