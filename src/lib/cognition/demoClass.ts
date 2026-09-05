import type { StudentState } from '@/lib/classroom';
import { getLessonForPlanet, type PlanetId } from '@/lib/planets';
import { GLOW_PLANETS, KID_LINE, NEXT_PLANET, TEACHER_LINE } from './catalog';
import type { Diagnosis, MisconceptionCode } from './types';

const STAMP = 1_725_580_800_000;

const earlyWarning = (code: MisconceptionCode, planet: PlanetId): string | null => {
  if (code === 'COUNT_ALL' && ['sun', 'mercury', 'venus'].includes(planet)) {
    return 'May stall on subtraction unless counting-on is practiced now.';
  }
  if (code === 'OVERSHOOT') {
    return 'Exact-total practice on Earth before word problems on Mars.';
  }
  if (code === 'DIGIT_REV') {
    return 'Written number formation needs a quick check before quizzes.';
  }
  return null;
};

const diagnosis = (
  primary: MisconceptionCode,
  confidence: number,
  planet: PlanetId
): Diagnosis => ({
  primary,
  confidence,
  scores: [{ code: primary, probability: confidence }],
  glowPlanets: GLOW_PLANETS[primary],
  nextPlanet: NEXT_PLANET[primary],
  kidLine: KID_LINE[primary],
  teacherLine: TEACHER_LINE[primary],
  earlyWarning: earlyWarning(primary, planet),
  updatedAt: STAMP,
});

const student = (
  nickname: string,
  planet: PlanetId,
  primary: MisconceptionCode,
  confidence: number,
  quiz?: { score: number; total: number; tries: number[] }
): StudentState => ({
  nickname,
  planet,
  lesson: getLessonForPlanet(planet),
  lastPlanet: planet,
  lastDiagnosis: diagnosis(primary, confidence, planet),
  lastQuiz: quiz
    ? { planet, lesson: getLessonForPlanet(planet), score: quiz.score, total: quiz.total, tries: quiz.tries }
    : undefined,
  lastUpdated: STAMP,
});

/** Fixed sample roster so judges can read a briefing without joining Firebase. */
export const SAMPLE_CLASS_CODE = 'SAMPLE';

export const SAMPLE_STUDENTS: StudentState[] = [
  student('QuietComet21', 'mercury', 'COUNT_ALL', 0.81),
  student('BraveOtter8', 'earth', 'OVERSHOOT', 0.74),
  student('SwiftMoon44', 'saturn', 'SUB_FLIP', 0.79, { score: 3, total: 5, tries: [1, 3, 2, 1, 2] }),
  student('CalmNova16', 'mars', 'COMMUTE', 0.71),
  student('KindRocket3', 'earth', 'DIGIT_REV', 0.76),
  student('LuckyStar55', 'jupiter', 'WORD_GAP', 0.62, { score: 4, total: 5, tries: [1, 1, 2, 1, 1] }),
  student('CoralShip7', 'jupiter', 'PLACE_SPLIT', 0.68),
  student('BrightOrbit9', 'venus', 'STEADY', 0.88, { score: 5, total: 5, tries: [1, 1, 1, 1, 1] }),
  student('GentleTide12', 'earth', 'STEADY', 0.91),
];
