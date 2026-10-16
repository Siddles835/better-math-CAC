import type {
  Assignment,
  Curriculum,
  CurriculumNode,
  LearnerRecord,
  Path,
  Problem,
} from '@/content/types';
import { problemsForNode } from '@/lib/paths/generators';
import { answerParses, exampleNumbersDiffer, leaksAnswer } from '@/lib/paths/text';
import { getLessonForPlanet } from '@/lib/planets';
import type { GeneratorId } from '@/content/types';

export const MIN_PROBLEMS = 3;
export const MAX_NODES = 40;
export const MAX_PROBLEMS = 20;
export const MAX_CURRICULUM_CHARS = 350_000;

const hash = (text: string): number => {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

const generatorForLegacy = (planetId: string): GeneratorId => {
  const lesson = getLessonForPlanet(planetId);
  if (lesson === 'subtraction') return 'subtraction';
  if (lesson === 'addition') return 'addition';
  return 'counting';
};

export const promptIdentity = (problem: Problem): string =>
  (problem.prompt || `${problem.promptKey}|${JSON.stringify(problem.promptValues ?? {})}|${problem.equation ?? ''}`)
    .trim()
    .toLowerCase();

/** Blank problem a teacher must fill in (used when splitting pads a short half). */
export const blankProblem = (id: string): Problem => ({
  id,
  type: 'numeric',
  prompt: '',
  answer: '',
  hints: ['', '', ''],
  difficulty: 1,
  topics: ['custom'],
});

const dedupeAuthored = (problems: Problem[]): Problem[] => {
  const seen = new Set<string>();
  const out: Problem[] = [];
  for (const problem of problems) {
    const identity = promptIdentity(problem);
    if (seen.has(identity)) continue;
    seen.add(identity);
    out.push({ ...problem });
  }
  return out;
};

export const materializeNodeProblems = (path: Path, nodeId: string): Problem[] => {
  const node = path.nodes.find((item) => item.id === nodeId);
  if (!node) return [];
  if (node.source.kind === 'authored') return dedupeAuthored(node.source.problems);
  if (node.source.kind === 'generated') {
    return problemsForNode(
      node.source.generatorId,
      node.source.tiers,
      node.source.perTier,
      hash(`${path.id}:${node.id}`)
    );
  }
  return problemsForNode(generatorForLegacy(node.source.planetId), [1, 2, 3], 2, hash(node.id));
};

export const duplicatePath = (path: Path, classCode: string, id: string, name: string): Curriculum => ({
  id,
  classCode,
  name,
  basedOnPathId: path.id,
  status: 'draft',
  updatedAt: Date.now(),
  nodes: path.nodes.map((node) => ({
    id: node.id,
    order: node.order,
    titleKey: node.titleKey,
    title: node.title ?? node.titleKey,
    prerequisites: [...node.prerequisites],
    topics: [...node.topics],
    masteryThreshold: node.masteryThreshold,
    extraPractice: node.extraPractice ?? 0,
    source: { kind: 'authored', problems: materializeNodeProblems(path, node.id) },
  })),
});

/** Fix order and chain prerequisites after add, remove, move, or split. */
export const renumber = (nodes: CurriculumNode[]): CurriculumNode[] =>
  nodes.map((node, index) => ({
    ...node,
    order: index + 1,
    prerequisites: index === 0 ? [] : [nodes[index - 1].id],
  }));

export const moveNode = (curriculum: Curriculum, index: number, direction: -1 | 1): Curriculum => {
  const next = index + direction;
  if (next < 0 || next >= curriculum.nodes.length) return curriculum;
  const nodes = [...curriculum.nodes];
  const [item] = nodes.splice(index, 1);
  nodes.splice(next, 0, item);
  return { ...curriculum, nodes: renumber(nodes), updatedAt: Date.now() };
};

/** Split needs at least two halves of MIN_PROBLEMS each (no copied prompts). */
export const canSplitNode = (node: CurriculumNode): boolean =>
  node.source.problems.length >= MIN_PROBLEMS * 2;

const padWithBlanks = (group: Problem[], nodeId: string, groupIndex: number): Problem[] => {
  const next = [...group];
  while (next.length < MIN_PROBLEMS) {
    next.push(blankProblem(`${nodeId}-pad-${groupIndex}-${next.length}`));
  }
  return next;
};

export const splitNode = (curriculum: Curriculum, nodeId: string): Curriculum => {
  const index = curriculum.nodes.findIndex((node) => node.id === nodeId);
  if (index < 0) return curriculum;
  const node = curriculum.nodes[index];
  if (!canSplitNode(node)) return curriculum;
  const problems = [...node.source.problems].sort((a, b) => a.difficulty - b.difficulty);
  const mid = Math.max(MIN_PROBLEMS, Math.ceil(problems.length / 2));
  const groups = [problems.slice(0, mid), problems.slice(mid)].filter((group) => group.length > 0);
  if (groups.length < 2) return curriculum;
  const padded = groups.map((group, groupIndex) => padWithBlanks(group, node.id, groupIndex));
  const children: CurriculumNode[] = padded.map((group, groupIndex) => ({
    ...node,
    id: `${node.id}-step-${groupIndex + 1}`,
    title: `${node.title} ${groupIndex + 1}`,
    topics: [...node.topics],
    masteryThreshold: Math.max(50, Math.min(node.masteryThreshold, 70)),
    extraPractice: node.extraPractice ?? 0,
    splitFrom: node.id,
    source: {
      kind: 'authored',
      problems: group.map((problem) => ({
        ...problem,
        id: `${problem.id}-s${groupIndex + 1}`,
        difficulty: Math.max(1, problem.difficulty - (groupIndex === 0 ? 1 : 0)) as Problem['difficulty'],
      })),
    },
  }));
  const nodes = [...curriculum.nodes];
  nodes.splice(index, 1, ...children);
  return { ...curriculum, nodes: renumber(nodes), updatedAt: Date.now() };
};

export type CurriculumIssue =
  | 'name'
  | 'nodes'
  | 'problems'
  | 'prompt'
  | 'answer'
  | 'duplicate-prompt'
  | 'threshold'
  | 'hint'
  | 'example'
  | 'size';

export const validateCurriculum = (curriculum: Curriculum): CurriculumIssue[] => {
  const issues = new Set<CurriculumIssue>();
  if (!curriculum.name.trim()) issues.add('name');
  if (curriculum.nodes.length === 0 || curriculum.nodes.length > MAX_NODES) issues.add('nodes');
  if (JSON.stringify(curriculum).length > MAX_CURRICULUM_CHARS) issues.add('size');
  for (const node of curriculum.nodes) {
    if (node.masteryThreshold < 50 || node.masteryThreshold > 100) issues.add('threshold');
    if (node.source.problems.length < MIN_PROBLEMS || node.source.problems.length > MAX_PROBLEMS) {
      issues.add('problems');
    }
    const seen = new Set<string>();
    for (const problem of node.source.problems) {
      const identity = promptIdentity(problem);
      if (!problem.prompt?.trim() && !problem.promptKey) issues.add('prompt');
      if (seen.has(identity)) issues.add('duplicate-prompt');
      seen.add(identity);
      if (!answerParses(problem.answer)) issues.add('answer');
      const hintText = [...(problem.hints ?? [])];
      if (leaksAnswer(hintText, problem.answer)) issues.add('hint');
      if (!exampleNumbersDiffer(problem)) issues.add('example');
    }
  }
  return [...issues];
};

/** Student assignment wins over the class assignment. Solo learners are not assigned curricula. */
export const resolveAssignment = (
  assignments: Assignment[],
  studentKey: string,
  solo = false
): Assignment | null => {
  if (solo) return null;
  const mine = assignments
    .filter((item) => item.scope.kind === 'student' && item.scope.studentKey === studentKey)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  if (mine[0]) return mine[0];
  const klass = assignments
    .filter((item) => item.scope.kind === 'class')
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return klass[0] ?? null;
};

/**
 * Deleting a curriculum removes its assignments.
 * Path progress and curriculum progress already stored on the learner stay put.
 * The learner falls back to their active path, or Foundations when that is missing.
 */
export const afterCurriculumDelete = (
  record: LearnerRecord,
  assignments: Assignment[],
  curriculumId: string
): { record: LearnerRecord; assignments: Assignment[]; fallbackPathId: string } => ({
  record,
  assignments: assignments.filter((item) => item.curriculumId !== curriculumId),
  fallbackPathId: record.activePathId || 'foundations',
});
