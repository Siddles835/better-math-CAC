import { describe, expect, it } from 'vitest';
import { PATHS } from '@/content/catalog';
import type { Curriculum, CurriculumNode, Problem } from '@/content/types';
import { hydrateCurriculum } from '@/lib/curriculum/hydrate';
import {
  blankProblem,
  canSplitNode,
  duplicatePath,
  MIN_PROBLEMS,
  renumber,
  splitNode,
  validateCurriculum,
} from '@/lib/curriculum/logic';

const makeProblem = (id: string, prompt: string, difficulty = 1): Problem => ({
  id,
  type: 'numeric',
  prompt,
  answer: '1',
  hints: ['', '', ''],
  difficulty: difficulty as Problem['difficulty'],
  topics: ['custom'],
});

const nodeWithProblems = (id: string, problems: Problem[]): CurriculumNode => ({
  id,
  order: 1,
  title: id,
  prerequisites: [],
  topics: ['custom'],
  masteryThreshold: 80,
  extraPractice: 0,
  source: { kind: 'authored', problems },
});

describe('duplicatePath validation', () => {
  it('gives every built-in path zero validation issues after hydrate', () => {
    for (const path of PATHS) {
      const raw = duplicatePath(path, 'demo', `dup-${path.id}`, `${path.id} copy`);
      const hydrated = hydrateCurriculum(raw);
      const issues = validateCurriculum(hydrated);
      expect(issues, path.id).toEqual([]);
    }
  });
});

describe('renumber', () => {
  it('fixes order and prerequisites after add and remove', () => {
    const a = nodeWithProblems('a', [makeProblem('a1', 'one'), makeProblem('a2', 'two'), makeProblem('a3', 'three')]);
    const b = nodeWithProblems('b', [makeProblem('b1', 'one'), makeProblem('b2', 'two'), makeProblem('b3', 'three')]);
    const c = nodeWithProblems('c', [makeProblem('c1', 'one'), makeProblem('c2', 'two'), makeProblem('c3', 'three')]);
    const added = renumber([a, b, c]);
    expect(added.map((node) => node.order)).toEqual([1, 2, 3]);
    expect(added[0].prerequisites).toEqual([]);
    expect(added[1].prerequisites).toEqual(['a']);
    expect(added[2].prerequisites).toEqual(['b']);

    const removed = renumber([a, c]);
    expect(removed.map((node) => node.id)).toEqual(['a', 'c']);
    expect(removed[1].prerequisites).toEqual(['a']);
    expect(removed[1].order).toBe(2);
  });
});

describe('splitNode', () => {
  it('refuses to split when there are fewer than 6 problems', () => {
    const problems = Array.from({ length: 5 }, (_, i) => makeProblem(`p${i}`, `prompt ${i}`, (i % 5) + 1));
    const node = nodeWithProblems('n1', problems);
    expect(canSplitNode(node)).toBe(false);
    const curriculum: Curriculum = {
      id: 'c1',
      classCode: 'demo',
      name: 'Test',
      status: 'draft',
      updatedAt: 1,
      nodes: [node],
    };
    expect(splitNode(curriculum, 'n1')).toBe(curriculum);
  });

  it('splits without duplicating prompts and pads short halves with blanks', () => {
    const problems = Array.from({ length: 6 }, (_, i) =>
      makeProblem(`p${i}`, `prompt ${i}`, (i % 5) + 1)
    );
    const node = nodeWithProblems('n1', problems);
    expect(canSplitNode(node)).toBe(true);
    const curriculum: Curriculum = {
      id: 'c1',
      classCode: 'demo',
      name: 'Test',
      status: 'draft',
      updatedAt: 1,
      nodes: [node],
    };
    const next = splitNode(curriculum, 'n1');
    expect(next.nodes).toHaveLength(2);
    for (const child of next.nodes) {
      expect(child.source.problems.length).toBeGreaterThanOrEqual(MIN_PROBLEMS);
      const prompts = child.source.problems.map((problem) => problem.prompt);
      const filled = prompts.filter((prompt) => prompt.trim().length > 0);
      expect(new Set(filled).size).toBe(filled.length);
      // Never pad by copying an existing prompt.
      expect(child.source.problems.every((problem) => problem.prompt.trim() || problem.id.includes('pad') || !problem.answer)).toBe(
        true
      );
    }
    expect(next.nodes[0].prerequisites).toEqual([]);
    expect(next.nodes[1].prerequisites).toEqual([next.nodes[0].id]);
  });
});

describe('blankProblem', () => {
  it('creates an empty problem that needs teacher input', () => {
    const problem = blankProblem('x');
    expect(problem.prompt).toBe('');
    expect(problem.answer).toBe('');
  });
});
