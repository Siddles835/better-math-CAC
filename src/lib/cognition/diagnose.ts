import { getLessonForPlanet, getPlanetIndex, type PlanetId } from '@/lib/planets';
import {
  GLOW_PLANETS,
  KID_LINE,
  NEXT_PLANET,
  TEACHER_LINE,
} from './catalog';
import { extractFeatures } from './features';
import type { LessonTrace } from './trace';
import type {
  CognitionFeatures,
  Diagnosis,
  LessonCode,
  MisconceptionCode,
  MisconceptionScore,
} from './types';
import { FEATURE_ORDER } from './types';
import { walkTree } from './walkTree';
import treeData from './models/misconception_tree.json';

const tree = treeData as Parameters<typeof walkTree>[0] & { classes: string[] };

const asCode = (label: string): MisconceptionCode => {
  const known: MisconceptionCode[] = [
    'COUNT_ALL',
    'OVERSHOOT',
    'SUB_FLIP',
    'COMMUTE',
    'DIGIT_REV',
    'WORD_GAP',
    'PLACE_SPLIT',
    'STEADY',
  ];
  return known.includes(label as MisconceptionCode) ? (label as MisconceptionCode) : 'STEADY';
};

const earlyWarningFor = (code: MisconceptionCode, planet: PlanetId): string | null => {
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

export const diagnoseFeatures = (
  planet: PlanetId,
  features: CognitionFeatures
): Diagnosis => {
  const values = FEATURE_ORDER.map((key) => features[key]);
  const walked = walkTree(tree, values);

  let primary = asCode(walked.label);
  let confidence = walked.confidence;

  if (features.drawReversal === 1 && features.drawMatch === 0) {
    primary = 'DIGIT_REV';
    confidence = Math.max(confidence, 0.72);
  } else if (features.overshoot >= 1 && features.correct === 0) {
    primary = 'OVERSHOOT';
    confidence = Math.max(confidence, 0.7);
  } else if (features.equationSwap === 1 && features.lessonCode === 1) {
    primary = 'COMMUTE';
    confidence = Math.max(confidence, 0.68);
  } else if (features.equationSwap === 1 && features.lessonCode === 2 && features.correct === 0) {
    primary = 'SUB_FLIP';
    confidence = Math.max(confidence, 0.68);
  } else if (features.restartFromOne === 1 && features.lessonCode === 0) {
    primary = 'COUNT_ALL';
    confidence = Math.max(confidence, 0.66);
  }

  const scores: MisconceptionScore[] = Object.entries(walked.shares)
    .map(([code, probability]) => ({
      code: asCode(code),
      probability,
    }))
    .sort((a, b) => b.probability - a.probability);

  if (!scores.some((s) => s.code === primary)) {
    scores.unshift({ code: primary, probability: confidence });
  }

  return {
    primary,
    confidence: Number(Math.min(0.96, confidence).toFixed(2)),
    scores,
    glowPlanets: GLOW_PLANETS[primary],
    nextPlanet: NEXT_PLANET[primary],
    kidLine: KID_LINE[primary],
    teacherLine: TEACHER_LINE[primary],
    earlyWarning: earlyWarningFor(primary, planet),
    updatedAt: Date.now(),
  };
};

export const diagnoseTrace = (planet: PlanetId, trace: LessonTrace): Diagnosis => {
  return diagnoseFeatures(planet, extractFeatures(planet, trace));
};

const lessonCodeFor = (planet: PlanetId): LessonCode => {
  const lesson = getLessonForPlanet(planet);
  if (lesson === 'addition') return 1;
  if (lesson === 'subtraction') return 2;
  return 0;
};

/** Quiz pages do not have pencil taps; tries per question still diagnose well. */
export const diagnoseFromQuiz = (
  planet: PlanetId,
  score: number,
  total: number,
  tries: number[]
): Diagnosis => {
  const extra = tries.filter((t) => t > 1).length;
  const missed = Math.max(0, total - score);
  const features: CognitionFeatures = {
    planetIndex: getPlanetIndex(planet),
    lessonCode: lessonCodeFor(planet),
    timeToFirst: extra > 2 ? 6 : 2,
    avgGap: extra > 2 ? 2.4 : 1.1,
    gapStd: extra > 2 ? 1.1 : 0.3,
    tapCount: total,
    removeCount: 0,
    retries: extra,
    overshoot: 0,
    undershoot: missed,
    correct: missed === 0 ? 1 : 0,
    drawMatch: 0,
    drawReversal: 0,
    drawConfidence: 0,
    equationSwap: 0,
    restartFromOne: extra >= 3 && lessonCodeFor(planet) === 0 ? 1 : 0,
  };
  return diagnoseFeatures(planet, features);
};
