export { computeExpectedAnswer, assertNonNegativeResult, inRange } from './compute';
export type { Operator } from './compute';
export { parseStudentAnswer, isJudgableTypedAnswer } from './parse';
export type { ParseResult } from './parse';
export {
  buildMcqOptions,
  buildEquationChipValues,
  equationAccepts,
} from './options';
export { mulberry32, fisherYates, pickInt } from './rng';
export type { Rng } from './rng';
export {
  QUIZ_DEFS,
  allQuizQuestions,
  materializeQuizQuestion,
  quizDefsFor,
  operatorFor,
} from './quizQuestions';
export type { QuizQuestionDef, AuditableQuestion, LessonKind } from './quizQuestions';
export {
  generateMercury,
  generateVenusMcq,
  generateJupiterMcq,
  generateNeptuneMcq,
  generatePersonalPathQuestions,
  generateForLesson,
} from './generators';
export {
  EARTH,
  MARS,
  SATURN,
  URANUS,
  SUN,
  earthDemoTotal,
  earthBuildAdd,
  earthDemoStory,
  earthBuildStory,
  marsNeed,
  marsStory,
  saturnDemoLeft,
  saturnBuildTake,
  saturnDemoStory,
  saturnPracticeStory,
  saturnBuildStory,
  uranusGiveAway,
  uranusStory,
  sunExpected,
  sunStory,
  rollMercury,
  rollVenus,
  rollJupiter,
  rollNeptune,
  planetAuditQuestions,
} from './planetProblems';
export {
  checkQuestion,
  checkLocaleText,
  checkEquationChips,
  checkTypedParsing,
  runAudit,
} from './audit';
export type { AuditViolation, AuditResult } from './audit';
export { extractDigits, localeNumberViolations } from './localeNumbers';
