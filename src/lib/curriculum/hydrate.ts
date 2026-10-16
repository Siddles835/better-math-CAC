import type { Curriculum, CurriculumNode, Problem } from '@/content/types';
import { tx } from '@/i18n/tx';
import { stripUndefined } from '@/lib/data/stripUndefined';
import { answerParses, exampleNumbersDiffer, leaksAnswer } from '@/lib/paths/text';
import { MIN_PROBLEMS } from '@/lib/curriculum/logic';

const KEY_RE = /^(ui|paths):[\w.-]+$/;

export const looksLikeKey = (value: string | undefined): boolean =>
  !!value && KEY_RE.test(value.trim());

const resolveKey = (key: string, values?: Record<string, string | number>): string => {
  try {
    return tx(key, values);
  } catch {
    return key;
  }
};

export const hydrateProblem = (problem: Problem): Problem => {
  let prompt = problem.prompt?.trim() ?? '';
  if (!prompt && problem.promptKey) {
    const base = resolveKey(problem.promptKey, problem.promptValues);
    prompt = problem.equation ? `${base} ${problem.equation}`.trim() : base;
  }

  let hints = problem.hints?.filter((line) => line.trim().length > 0) ?? [];
  if (hints.length === 0 && problem.hintKeys?.length) {
    hints = problem.hintKeys.map((key) => resolveKey(key));
  }
  while (hints.length < 3) hints.push('');

  let workedExample = problem.workedExample;
  const examplePrompt = workedExample?.prompt?.trim() ?? '';
  if (workedExample && !examplePrompt && workedExample.promptKey) {
    const next: NonNullable<Problem['workedExample']> = {
      ...workedExample,
      prompt: resolveKey(workedExample.promptKey, workedExample.promptValues),
    };
    if (workedExample.promptValues) next.promptValues = workedExample.promptValues;
    if (workedExample.promptKey) next.promptKey = workedExample.promptKey;
    workedExample = next;
  }

  const hydrated: Problem = {
    ...problem,
    prompt,
    hints: hints.slice(0, Math.max(3, hints.length)),
  };
  // Never leave workedExample: undefined (Firestore setDoc rejects it).
  if (workedExample) hydrated.workedExample = workedExample;
  else delete hydrated.workedExample;
  return stripUndefined(hydrated);
};

export const hydrateNode = (node: CurriculumNode): CurriculumNode => {
  let title = node.title?.trim() ?? '';
  if (!title || looksLikeKey(title)) {
    if (node.titleKey) title = resolveKey(node.titleKey);
    else if (looksLikeKey(node.title)) title = resolveKey(node.title);
  }
  return {
    ...node,
    title,
    source: {
      kind: 'authored',
      problems: node.source.problems.map(hydrateProblem),
    },
  };
};

/** Fill editable text from i18n keys without changing updatedAt. */
export const hydrateCurriculum = (curriculum: Curriculum): Curriculum =>
  stripUndefined({
    ...curriculum,
    nodes: curriculum.nodes.map(hydrateNode),
  });

export type ProblemFieldIssue = 'prompt' | 'answer' | 'hint' | 'example';

export const problemFieldIssues = (problem: Problem): ProblemFieldIssue[] => {
  const issues: ProblemFieldIssue[] = [];
  if (!problem.prompt?.trim()) issues.push('prompt');
  if (!answerParses(problem.answer)) issues.push('answer');
  if (leaksAnswer(problem.hints ?? [], problem.answer)) issues.push('hint');
  if (!exampleNumbersDiffer(problem)) issues.push('example');
  return issues;
};

export const nodeHasProblems = (node: CurriculumNode): boolean => {
  if (!node.title.trim()) return true;
  if (node.source.problems.length < MIN_PROBLEMS) return true;
  return node.source.problems.some((problem) => problemFieldIssues(problem).length > 0);
};

export const countProblems = (curriculum: Curriculum): number =>
  curriculum.nodes.reduce((sum, node) => sum + node.source.problems.length, 0);
