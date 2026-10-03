import type { PlanetId } from '@/lib/planets';

export type MisconceptionCode =
  | 'COUNT_ALL'
  | 'OVERSHOOT'
  | 'SUB_FLIP'
  | 'COMMUTE'
  | 'DIGIT_REV'
  | 'WORD_GAP'
  | 'PLACE_SPLIT'
  | 'STEADY';

export type LessonCode = 0 | 1 | 2;

export interface TraceEvent {
  t: number;
  kind: 'tap' | 'remove' | 'check' | 'reset' | 'draw' | 'equation';
  value?: number;
  target?: number;
  extra?: number;
}

export type UnreadableReason =
  | 'too_small'
  | 'too_few_points'
  | 'low_confidence'
  | 'ambiguous'
  | 'too_many_parts';

export type DigitScript = 'western' | 'arabic' | 'devanagari';

export interface DigitRead {
  status: 'ok' | 'unreadable';
  /** Combined value for one or two digits. 0 when unreadable. */
  digit: number;
  confidence: number;
  reversal: boolean;
  strokeCount: number;
  startQuadrant: number;
  reason?: UnreadableReason;
  /** Digits left to right when status is ok. */
  parts?: number[];
  script?: DigitScript;
}

export interface CognitionFeatures {
  planetIndex: number;
  lessonCode: LessonCode;
  timeToFirst: number;
  avgGap: number;
  gapStd: number;
  tapCount: number;
  removeCount: number;
  retries: number;
  overshoot: number;
  undershoot: number;
  correct: number;
  drawMatch: number;
  drawReversal: number;
  drawConfidence: number;
  equationSwap: number;
  restartFromOne: number;
}

export interface MisconceptionScore {
  code: MisconceptionCode;
  probability: number;
}

export interface Diagnosis {
  primary: MisconceptionCode;
  confidence: number;
  scores: MisconceptionScore[];
  glowPlanets: PlanetId[];
  nextPlanet: PlanetId;
  kidLine: string;
  teacherLine: string;
  earlyWarning: string | null;
  updatedAt: number;
}

export const FEATURE_ORDER: (keyof CognitionFeatures)[] = [
  'planetIndex',
  'lessonCode',
  'timeToFirst',
  'avgGap',
  'gapStd',
  'tapCount',
  'removeCount',
  'retries',
  'overshoot',
  'undershoot',
  'correct',
  'drawMatch',
  'drawReversal',
  'drawConfidence',
  'equationSwap',
  'restartFromOne',
];
