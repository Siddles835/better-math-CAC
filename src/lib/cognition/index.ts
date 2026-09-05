export type { Diagnosis, DigitRead, MisconceptionCode } from './types';
export { LessonTrace } from './trace';
export { diagnoseTrace, diagnoseFromQuiz, diagnoseFeatures } from './diagnose';
export { readDrawnDigit } from './digitModel';
export { extractFeatures } from './features';
export { buildClassBriefing, briefingHeadline, briefingToText } from './briefing';
export type { ClassBriefing, BriefingAction } from './briefing';
export {
  MISCONCEPTION_LABEL,
  KID_LINE,
  TEACHER_LINE,
  PRACTICE_TITLE,
  GLOW_PLANETS,
  NEXT_PLANET,
  confidenceLabel,
} from './catalog';
