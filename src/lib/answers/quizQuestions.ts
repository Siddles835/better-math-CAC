import { computeExpectedAnswer, type Operator } from './compute';
import { buildMcqOptions } from './options';
import { mulberry32 } from './rng';

export type LessonKind = 'counting' | 'addition' | 'subtraction';

export interface QuizQuestionDef {
  id: string;
  lesson: LessonKind;
  kind: LessonKind;
  /** English story (source of truth for meaning). */
  story: string;
  /** English question. */
  question: string;
  num1: number;
  num2?: number;
  /** Icon name for counting pictures (resolved in StoryQuiz). */
  icon?: 'Star' | 'Apple' | 'Shirt' | 'Circle' | 'Gauge' | 'AppWindow' | 'Rocket';
  iconFill?: boolean;
  iconClass?: string;
  /** Planet range hint for audit. */
  range: [number, number];
}

const countingDefs: QuizQuestionDef[] = [
  {
    id: 'c0',
    lesson: 'counting',
    kind: 'counting',
    story: 'Luna is going to space! She packs her bag.',
    question: 'How many stars does Luna pack?',
    num1: 5,
    icon: 'Star',
    iconFill: true,
    range: [1, 10],
  },
  {
    id: 'c1',
    lesson: 'counting',
    kind: 'counting',
    story: 'Luna looks at her food.',
    question: 'How many apples are ready for the trip?',
    num1: 7,
    icon: 'Apple',
    range: [1, 10],
  },
  {
    id: 'c2',
    lesson: 'counting',
    kind: 'counting',
    story: 'She gets her suits.',
    question: 'How many space suits does Luna have?',
    num1: 3,
    icon: 'Shirt',
    range: [1, 10],
  },
  {
    id: 'c3',
    lesson: 'counting',
    kind: 'counting',
    story: 'Luna sees buttons on the control panel.',
    question: 'How many blue buttons does she see?',
    num1: 6,
    icon: 'Circle',
    iconFill: true,
    iconClass: 'bg-sky-500/30 text-sky-400',
    range: [1, 10],
  },
  {
    id: 'c4',
    lesson: 'counting',
    kind: 'counting',
    story: 'She checks the power meters.',
    question: 'How many power meters are lit?',
    num1: 4,
    icon: 'Gauge',
    range: [1, 10],
  },
  {
    id: 'c5',
    lesson: 'counting',
    kind: 'counting',
    story: 'Luna counts windows on the ship.',
    question: 'How many windows does Luna count?',
    num1: 8,
    icon: 'AppWindow',
    range: [1, 10],
  },
  {
    id: 'c6',
    lesson: 'counting',
    kind: 'counting',
    story: 'Time to go! She sees stars outside.',
    question: 'How many bright stars does she see?',
    num1: 6,
    icon: 'Star',
    iconFill: true,
    range: [1, 10],
  },
  {
    id: 'c7',
    lesson: 'counting',
    kind: 'counting',
    story: 'Luna made it! She is happy.',
    question: 'How many toy rockets does Luna have?',
    num1: 2,
    icon: 'Rocket',
    range: [1, 10],
  },
];

const additionDefs: QuizQuestionDef[] = [
  {
    id: 'a0',
    lesson: 'addition',
    kind: 'addition',
    story: 'Max likes to paint. He has brushes.',
    question: 'Max has 2 brushes. He gets 3 more. How many now?',
    num1: 2,
    num2: 3,
    range: [1, 10],
  },
  {
    id: 'a1',
    lesson: 'addition',
    kind: 'addition',
    story: 'Max has paint jars.',
    question: 'He has 3 red and 2 blue. How many in all?',
    num1: 3,
    num2: 2,
    range: [1, 10],
  },
  {
    id: 'a2',
    lesson: 'addition',
    kind: 'addition',
    story: 'He looks at his papers.',
    question: '2 big papers and 4 small papers. How many?',
    num1: 2,
    num2: 4,
    range: [1, 10],
  },
  {
    id: 'a3',
    lesson: 'addition',
    kind: 'addition',
    story: 'Friends come to paint!',
    question: '4 kids here. 2 more come. How many kids?',
    num1: 4,
    num2: 2,
    range: [1, 10],
  },
  {
    id: 'a4',
    lesson: 'addition',
    kind: 'addition',
    story: 'Time for a snack!',
    question: 'Max has 3 grapes. He gets 4 more. How many?',
    num1: 3,
    num2: 4,
    range: [1, 10],
  },
  {
    id: 'a5',
    lesson: 'addition',
    kind: 'addition',
    story: 'Max finds rocks.',
    question: 'He has 1 rock. He finds 5 more. How many?',
    num1: 1,
    num2: 5,
    range: [1, 10],
  },
  {
    id: 'a6',
    lesson: 'addition',
    kind: 'addition',
    story: 'He draws with crayons.',
    question: '2 crayons here and 2 more there. How many?',
    num1: 2,
    num2: 2,
    range: [1, 10],
  },
  {
    id: 'a7',
    lesson: 'addition',
    kind: 'addition',
    story: 'Max is done! He made art.',
    question: 'He made 3 drawings today and 3 yesterday. How many?',
    num1: 3,
    num2: 3,
    range: [1, 10],
  },
];

const subtractionDefs: QuizQuestionDef[] = [
  {
    id: 's0',
    lesson: 'subtraction',
    kind: 'subtraction',
    story: 'Zara has pencils for class.',
    question: 'She has 5 pencils. She gives 2 away. How many left?',
    num1: 5,
    num2: 2,
    range: [0, 10],
  },
  {
    id: 's1',
    lesson: 'subtraction',
    kind: 'subtraction',
    story: 'The kids need erasers.',
    // Reworded: avoid "one each" (two valid readings / stray "1" in locales).
    question: 'There are 6 erasers. Kids take 2 away. How many left?',
    num1: 6,
    num2: 2,
    range: [0, 10],
  },
  {
    id: 's2',
    lesson: 'subtraction',
    kind: 'subtraction',
    story: 'Lunch time! Cookies for all.',
    question: 'There are 7 cookies. 3 get eaten. How many left?',
    num1: 7,
    num2: 3,
    range: [0, 10],
  },
  {
    id: 's3',
    lesson: 'subtraction',
    kind: 'subtraction',
    story: 'Books on the shelf.',
    question: '6 books are here. 1 is taken. How many now?',
    num1: 6,
    num2: 1,
    range: [0, 10],
  },
  {
    id: 's4',
    lesson: 'subtraction',
    kind: 'subtraction',
    story: 'Zara has stickers.',
    question: 'She has 8 stickers. She gives 4 away. How many left?',
    num1: 8,
    num2: 4,
    range: [0, 10],
  },
  {
    id: 's5',
    lesson: 'subtraction',
    kind: 'subtraction',
    story: 'Apples in a bowl.',
    question: '5 apples. 2 are eaten. How many left?',
    num1: 5,
    num2: 2,
    range: [0, 10],
  },
  {
    id: 's6',
    lesson: 'subtraction',
    kind: 'subtraction',
    story: 'Kids go home.',
    question: '7 kids were here. 2 left. How many still here?',
    num1: 7,
    num2: 2,
    range: [0, 10],
  },
  {
    id: 's7',
    lesson: 'subtraction',
    kind: 'subtraction',
    story: 'Good day at school!',
    question: '9 crayons. 3 are lost. How many left?',
    num1: 9,
    num2: 3,
    range: [0, 10],
  },
];

export const QUIZ_DEFS: QuizQuestionDef[] = [
  ...countingDefs,
  ...additionDefs,
  ...subtractionDefs,
];

export const operatorFor = (kind: LessonKind): Operator => {
  if (kind === 'counting') return 'count';
  if (kind === 'addition') return '+';
  return '−';
};

export interface AuditableQuestion {
  id: string;
  lesson: string;
  kind: LessonKind;
  operands: number[];
  operator: Operator;
  shownText: string;
  expectedAnswer: number;
  options: number[];
  pictureCounts: number[];
  range: [number, number];
  story: string;
  question: string;
}

/** Materialize a quiz def: answer is always derived; options are deterministic per id. */
export const materializeQuizQuestion = (def: QuizQuestionDef): AuditableQuestion => {
  const operator = operatorFor(def.kind);
  const num2 = def.num2 ?? 0;
  const expectedAnswer = computeExpectedAnswer(operator, def.num1, num2);
  const seed = [...def.id].reduce((h, ch) => (Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0), 2166136261);
  const options =
    def.kind === 'counting'
      ? buildMcqOptions(expectedAnswer, mulberry32(seed), 1, 9)
      : buildMcqOptions(expectedAnswer, mulberry32(seed), 0, 9);
  const operands = def.kind === 'counting' ? [def.num1] : [def.num1, num2];
  return {
    id: def.id,
    lesson: `quiz/${def.lesson}`,
    kind: def.kind,
    operands,
    operator,
    shownText: `${def.story} ${def.question}`,
    expectedAnswer,
    options,
    pictureCounts: def.kind === 'counting' ? [def.num1] : [],
    range: def.range,
    story: def.story,
    question: def.question,
  };
};

export const allQuizQuestions = (): AuditableQuestion[] =>
  QUIZ_DEFS.map(materializeQuizQuestion);

export const quizDefsFor = (lesson: LessonKind): QuizQuestionDef[] =>
  QUIZ_DEFS.filter((d) => d.lesson === lesson);
