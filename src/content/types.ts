import type { Operator } from '@/lib/answers/compute';
import type { PlanetId } from '@/lib/planets';

export type PathId = string;
export type ProblemType = 'numeric' | 'multipleChoice' | 'expression';
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type GeneratorId =
  | 'counting'
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'algebra'
  | 'geometry';

export interface PathTheme {
  id: string;
  accent: string;
  surface: string;
  ink: string;
}

export interface DiagramSpec {
  shape: 'rect' | 'angle';
  labels: Record<string, number | '?'>;
}

export interface WorkedExample {
  prompt?: string;
  steps?: string[];
  promptKey?: string;
  promptValues?: Record<string, string | number>;
  stepKeys?: string[];
}

/** A checkable item. Built-in copy uses i18n keys. Teacher copy uses prompt text. */
export interface Problem {
  id: string;
  type: ProblemType;
  promptKey?: string;
  promptValues?: Record<string, string | number>;
  prompt?: string;
  equation?: string;
  answer: string;
  choices?: string[];
  hintKeys?: string[];
  hints?: string[];
  workedExample?: WorkedExample;
  difficulty: Difficulty;
  topics: string[];
  diagram?: DiagramSpec;
  /** Operands and operator used to derive `answer`. Present on generated items. */
  operands?: number[];
  operator?: Operator;
}

export type NodeSource =
  | { kind: 'legacy'; planetId: PlanetId }
  | { kind: 'generated'; generatorId: GeneratorId; tiers: Array<1 | 2 | 3>; perTier: number }
  | { kind: 'authored'; problems: Problem[] };

export interface PathNode {
  id: string;
  order: number;
  titleKey: string;
  title?: string;
  prerequisites: string[];
  topics: string[];
  /** Percent, default 80. Teachers may set 50 to 100. */
  masteryThreshold: number;
  extraPractice?: number;
  source: NodeSource;
  splitFrom?: string;
}

export interface Path {
  id: PathId;
  titleKey: string;
  summaryKey: string;
  theme: PathTheme;
  nodes: PathNode[];
}

export interface SkillBand {
  id: string;
  pathId: PathId;
  topic: string;
  order: number;
  nodeId: string;
  generatorId: GeneratorId;
  tier: 1 | 2 | 3;
  /** Foundations bands reuse the existing placement bank. */
  placementLevel?: string;
}

export interface NodeMastery {
  correct: number;
  attempts: number;
  mastered: boolean;
}

export interface PathProgress {
  currentNodeId: string;
  completedNodeIds: string[];
  nodeMastery: Record<string, NodeMastery>;
  topicMastery: Record<string, { correct: number; attempts: number }>;
}

export interface AssessmentSummary {
  id: string;
  at: number;
  recommendedPathId: PathId;
  recommendedNodeId: string;
  clearedIndex: number;
  byPath: Record<string, { clearedBandId: string | null; topics: Record<string, 'strength' | 'practice' | 'not-checked'> }>;
  strengths: string[];
  practiceTopics: string[];
}

export interface LearnerRecord {
  activePathId: PathId;
  paths: Record<string, PathProgress>;
  /** Progress for assigned curricula, keyed by curriculum id then node id. */
  curriculumProgress?: Record<string, PathProgress>;
  assessments: AssessmentSummary[];
  /** Local calendar day (YYYY-MM-DD) to foreground seconds. */
  timeByDay: Record<string, number>;
}

export interface CurriculumNode extends Omit<PathNode, 'source' | 'titleKey'> {
  titleKey?: string;
  title: string;
  source: { kind: 'authored'; problems: Problem[] };
}

export interface Curriculum {
  id: string;
  classCode: string;
  name: string;
  basedOnPathId?: PathId;
  status: 'draft' | 'published';
  nodes: CurriculumNode[];
  updatedAt: number;
}

export interface Assignment {
  id: string;
  curriculumId: string;
  scope: { kind: 'class' } | { kind: 'student'; studentKey: string };
  mode: 'replace' | 'alongside';
  updatedAt: number;
}

export interface PilotGoals {
  whereWeAre: string;
  whereWeWant: string;
  updatedAt: number;
}

export const ASSESSMENT_CAP = 12;
export const TIME_DAY_CAP = 180;
export const DEFAULT_MASTERY = 80;
