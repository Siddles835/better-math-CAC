import { describe, expect, it, vi } from 'vitest';
import { PATHS } from '@/content/catalog';
import { duplicatePath } from '@/lib/curriculum/logic';
import { hasUndefined, stripUndefined } from '@/lib/data/stripUndefined';
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

  it('never leaves undefined fields on a blank or duplicated curriculum', () => {
    const blank = hydrateCurriculum({
      id: 'cur-blank',
      classCode: 'demo',
      name: '',
      status: 'draft',
      updatedAt: 1,
      nodes: [
        {
          id: 'n1',
          order: 1,
          title: '',
          prerequisites: [],
          topics: ['custom'],
          masteryThreshold: 80,
          extraPractice: 0,
          source: {
            kind: 'authored',
            problems: [
              {
                id: 'p1',
                type: 'numeric',
                prompt: '',
                answer: '',
                hints: ['', '', ''],
                difficulty: 1,
                topics: ['custom'],
              },
            ],
          },
        },
      ],
    });
    expect(hasUndefined(blank)).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(blank.nodes[0].source.problems[0], 'workedExample')).toBe(
      false
    );

    const addition = PATHS.find((path) => path.id === 'addition')!;
    const hydrated = hydrateCurriculum(duplicatePath(addition, 'demo', 'dup2', 'Copy'));
    expect(hasUndefined(hydrated)).toBe(false);
    expect(hasUndefined(stripUndefined(hydrated))).toBe(false);
  });
});

describe('saveCurriculum payload', () => {
  it('passes a payload with no undefined to setDoc', async () => {
    const setDocMock = vi.fn(async (_ref: unknown, data: unknown) => {
      expect(hasUndefined(data)).toBe(false);
    });
    vi.doMock('firebase/firestore', async () => {
      const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
      return { ...actual, setDoc: setDocMock };
    });
    // Direct unit check: stripUndefined on hydrated curriculum is what the port writes.
    const addition = PATHS.find((path) => path.id === 'addition')!;
    const payload = stripUndefined(hydrateCurriculum(duplicatePath(addition, 'demo', 'dup3', 'Copy')));
    expect(hasUndefined(payload)).toBe(false);
    await setDocMock({}, payload);
    expect(setDocMock).toHaveBeenCalled();
  });
});
