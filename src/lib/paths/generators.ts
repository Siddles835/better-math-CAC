import { computeExpectedAnswer, type Operator } from '@/lib/answers/compute';
import { buildMcqOptions } from '@/lib/answers/options';
import { mulberry32, pickInt, type Rng } from '@/lib/answers/rng';
import type { AuditableQuestion } from '@/lib/answers/quizQuestions';
import type { DiagramSpec, Difficulty, GeneratorId, Problem, ProblemType } from '@/content/types';

/**
 * Division policy: every division item divides evenly.
 * The dividend is divisor × quotient. The answer is the integer quotient.
 * There are no remainder items.
 *
 * Algebra means one-step equations (x + a = b, x − a = b, a × x = b), not matrices.
 */

export const PATH_GENERATOR_IDS: GeneratorId[] = [
  'counting',
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'algebra',
  'geometry',
];

const HINTS: Record<GeneratorId, string[]> = {
  counting: ['paths:hint_count_1', 'paths:hint_count_2', 'paths:hint_count_3'],
  addition: ['paths:hint_add_1', 'paths:hint_add_2', 'paths:hint_add_3'],
  subtraction: ['paths:hint_sub_1', 'paths:hint_sub_2', 'paths:hint_sub_3'],
  multiplication: ['paths:hint_mul_1', 'paths:hint_mul_2', 'paths:hint_mul_3'],
  division: ['paths:hint_div_1', 'paths:hint_div_2', 'paths:hint_div_3'],
  algebra: ['paths:hint_alg_1', 'paths:hint_alg_2', 'paths:hint_alg_3'],
  geometry: ['paths:hint_geo_1', 'paths:hint_geo_2', 'paths:hint_geo_3'],
};

const PROMPT_KEY: Record<GeneratorId, string> = {
  counting: 'paths:q_count',
  addition: 'paths:q_add',
  subtraction: 'paths:q_sub',
  multiplication: 'paths:q_mul',
  division: 'paths:q_div',
  algebra: 'paths:q_alg',
  geometry: 'paths:q_geo',
};

export const FEEDBACK_KEYS = ['paths:playCorrect', 'paths:playNotYet', 'paths:playUnreadable', 'paths:playMore'] as const;

const topicFor = (id: GeneratorId, tier: 1 | 2 | 3): string => {
  if (id === 'geometry') return tier === 1 ? 'perimeter' : tier === 2 ? 'area' : 'angles';
  if (id === 'algebra') return tier === 1 ? 'add-unknown' : tier === 2 ? 'sub-unknown' : 'scale-unknown';
  if (id === 'division') return 'exact-quotient';
  return id;
};

const difficultyFor = (tier: 1 | 2 | 3): Difficulty => (tier === 1 ? 1 : tier === 2 ? 3 : 5);

interface Built {
  operator: Operator;
  operands: [number, number];
  equation: string;
  promptValues: Record<string, string | number>;
  diagram?: DiagramSpec;
  type: ProblemType;
  topic: string;
}

const ranges = (id: GeneratorId, tier: 1 | 2 | 3) => {
  if (id === 'counting') return tier === 1 ? [1, 9] : tier === 2 ? [10, 20] : [21, 40];
  if (id === 'addition' || id === 'subtraction') {
    return tier === 1 ? [1, 9] : tier === 2 ? [4, 20] : [12, 40];
  }
  if (id === 'multiplication' || id === 'division') {
    return tier === 1 ? [1, 5] : tier === 2 ? [2, 9] : [3, 12];
  }
  if (id === 'algebra') return tier === 1 ? [1, 9] : tier === 2 ? [2, 12] : [2, 9];
  return tier === 1 ? [2, 8] : tier === 2 ? [3, 12] : [20, 70];
};

const buildSpec = (id: GeneratorId, tier: 1 | 2 | 3, rng: Rng): Built => {
  const [lo, hi] = ranges(id, tier);
  const topic = topicFor(id, tier);
  if (id === 'counting') {
    const n = pickInt(rng, lo, hi);
    return {
      operator: 'count',
      operands: [n, 0],
      equation: String(n),
      promptValues: { a: n, b: 0 },
      type: 'numeric',
      topic,
    };
  }
  if (id === 'addition') {
    let a = pickInt(rng, lo, hi);
    let b = pickInt(rng, lo, hi);
    if (a + b > hi * 2) b = Math.max(1, hi - a);
    return {
      operator: '+',
      operands: [a, b],
      equation: `${a} + ${b}`,
      promptValues: { a, b },
      type: rng() < 0.45 ? 'multipleChoice' : 'numeric',
      topic,
    };
  }
  if (id === 'subtraction') {
    let a = pickInt(rng, lo, hi);
    let b = pickInt(rng, lo, hi);
    if (b > a) [a, b] = [b, a];
    return {
      operator: '−',
      operands: [a, b],
      equation: `${a} − ${b}`,
      promptValues: { a, b },
      type: rng() < 0.45 ? 'multipleChoice' : 'numeric',
      topic,
    };
  }
  if (id === 'multiplication') {
    const a = pickInt(rng, Math.max(1, lo), hi);
    const b = pickInt(rng, Math.max(1, lo), tier === 3 ? Math.min(hi, 6) : hi);
    return {
      operator: '×',
      operands: [a, b],
      equation: `${a} × ${b}`,
      promptValues: { a, b },
      type: rng() < 0.4 ? 'multipleChoice' : 'numeric',
      topic,
    };
  }
  if (id === 'division') {
    const divisor = pickInt(rng, Math.max(1, lo), hi);
    const quotient = pickInt(rng, Math.max(1, lo), tier === 3 ? 9 : hi);
    const dividend = divisor * quotient;
    return {
      operator: '÷',
      operands: [dividend, divisor],
      equation: `${dividend} ÷ ${divisor}`,
      promptValues: { a: dividend, b: divisor },
      type: rng() < 0.4 ? 'multipleChoice' : 'numeric',
      topic,
    };
  }
  if (id === 'algebra') {
    if (tier === 1) {
      const addend = pickInt(rng, lo, hi);
      const x = pickInt(rng, 1, hi);
      const total = x + addend;
      return {
        operator: 'solve-add',
        operands: [total, addend],
        equation: `x + ${addend} = ${total}`,
        promptValues: { a: addend, b: total, equation: `x + ${addend} = ${total}` },
        type: 'expression',
        topic,
      };
    }
    if (tier === 2) {
      const sub = pickInt(rng, lo, hi);
      const result = pickInt(rng, 0, hi);
      const x = result + sub;
      return {
        operator: 'solve-sub',
        operands: [result, sub],
        equation: `x − ${sub} = ${result}`,
        promptValues: { a: sub, b: result, equation: `x − ${sub} = ${result}` },
        type: 'expression',
        topic,
      };
    }
    const factor = pickInt(rng, Math.max(2, lo), hi);
    const x = pickInt(rng, 2, hi);
    const product = factor * x;
    return {
      operator: 'solve-mul',
      operands: [product, factor],
      equation: `${factor}x = ${product}`,
      promptValues: { a: factor, b: product, equation: `${factor}x = ${product}` },
      type: 'expression',
      topic,
    };
  }
  if (tier === 1) {
    const w = pickInt(rng, lo, hi);
    const h = pickInt(rng, lo, hi);
    return {
      operator: 'perimeter',
      operands: [w, h],
      equation: `${w} × ${h}`,
      promptValues: { a: w, b: h, ask: 'perimeter' },
      diagram: { shape: 'rect', labels: { width: w, height: h, ask: '?' } },
      type: 'numeric',
      topic,
    };
  }
  if (tier === 2) {
    const w = pickInt(rng, lo, hi);
    const h = pickInt(rng, lo, hi);
    return {
      operator: 'area',
      operands: [w, h],
      equation: `${w} × ${h}`,
      promptValues: { a: w, b: h, ask: 'area' },
      diagram: { shape: 'rect', labels: { width: w, height: h, ask: '?' } },
      type: 'numeric',
      topic,
    };
  }
  const a = pickInt(rng, lo, hi);
  const b = pickInt(rng, lo, Math.min(hi, 180 - a - 1));
  return {
    operator: 'angle',
    operands: [a, b],
    equation: `${a} + ${b}`,
    promptValues: { a, b, ask: 'angle' },
    diagram: { shape: 'angle', labels: { a, b, ask: '?' } },
    type: 'numeric',
    topic,
  };
};

const examplePair = (operator: Operator, a: number, b: number): [number, number] => {
  let ea = a + 2;
  let eb = b + 3;
  if (operator === '÷' || operator === 'solve-mul') {
    ea = b + 1;
    eb = a === 0 ? 2 : Math.max(1, Math.round(a / Math.max(b, 1)) + 1);
    if (ea === b && eb * ea === a) eb += 1;
    return [ea * eb, ea];
  }
  if (operator === 'solve-sub') {
    return [a + 2, b + 3];
  }
  if (operator === '−' && eb > ea) [ea, eb] = [eb, ea];
  if (operator === 'angle' && ea + eb >= 180) {
    ea = 30;
    eb = 40;
  }
  if (ea === a || eb === b || ea === b || eb === a) {
    ea += 4;
    eb += 5;
  }
  return [ea, eb];
};

export interface GeneratedItem {
  problem: Problem;
  audit: AuditableQuestion;
}

export const generatePathItem = (
  id: GeneratorId,
  tier: 1 | 2 | 3,
  seed: number
): GeneratedItem => {
  const rng = mulberry32(seed >>> 0);
  const spec = buildSpec(id, tier, rng);
  const [n1, n2] = spec.operands;
  const expected = computeExpectedAnswer(spec.operator, n1, n2);
  const [ea, eb] = examplePair(spec.operator, n1, n2);
  const exampleAnswer = computeExpectedAnswer(spec.operator, ea, eb);
  let choices: string[] | undefined;
  if (spec.type === 'multipleChoice') {
    const lo = Math.max(0, expected - 8);
    const hi = Math.max(lo + 6, expected + 8);
    choices = buildMcqOptions(expected, rng, lo, hi).map(String);
  }
  const problem: Problem = {
    id: `${id}-t${tier}-${seed}`,
    type: spec.type,
    promptKey:
      spec.operator === 'perimeter'
        ? 'paths:q_perim'
        : spec.operator === 'area'
          ? 'paths:q_area'
          : spec.operator === 'angle'
            ? 'paths:q_angle'
            : PROMPT_KEY[id],
    promptValues: spec.promptValues,
    equation: spec.equation,
    answer: String(expected),
    choices,
    hintKeys: HINTS[id],
    workedExample: {
      promptKey: 'paths:ex_prompt',
      promptValues: { a: ea, b: eb, answer: exampleAnswer },
      stepKeys: ['paths:ex_step'],
    },
    difficulty: difficultyFor(tier),
    topics: [spec.topic],
    diagram: spec.diagram,
    operands: [n1, n2],
    operator: spec.operator,
  };
  const shown = `${id} ${spec.equation}`;
  const audit: AuditableQuestion = {
    id: problem.id,
    lesson: `path/${id}`,
    kind: 'addition',
    operands: n2 === 0 && spec.operator === 'count' ? [n1] : [n1, n2],
    operator: spec.operator,
    shownText: shown,
    expectedAnswer: expected,
    options: choices ? choices.map(Number) : [],
    pictureCounts: [],
    range: [0, Math.max(expected, 1)],
    story: shown,
    question: shown,
  };
  return { problem, audit };
};

/** Stable item for the 5000-seed audit. Tier rotates with the seed. */
export const auditItem = (id: GeneratorId, seed: number): AuditableQuestion => {
  const tier = ((seed % 3) + 1) as 1 | 2 | 3;
  return generatePathItem(id, tier, seed).audit;
};

export const problemsForNode = (
  id: GeneratorId,
  tiers: Array<1 | 2 | 3>,
  perTier: number,
  seed: number,
  extra = 0
): Problem[] => {
  const out: Problem[] = [];
  let n = 0;
  for (const tier of tiers) {
    for (let i = 0; i < perTier; i += 1) {
      out.push(generatePathItem(id, tier, (seed + n * 997) >>> 0).problem);
      n += 1;
    }
  }
  const top = tiers[tiers.length - 1] ?? 1;
  for (let i = 0; i < extra; i += 1) {
    out.push(generatePathItem(id, top, (seed + 5000 + i * 13) >>> 0).problem);
  }
  return out;
};
