import type { PlanetId } from '@/lib/planets';
import type { MisconceptionCode } from './types';

export const MISCONCEPTION_LABEL: Record<MisconceptionCode, string> = {
  COUNT_ALL: 'Counting from one each time',
  OVERSHOOT: 'Going past the target',
  SUB_FLIP: 'Subtracting the smaller from the larger',
  COMMUTE: 'Treating 2+5 and 5+2 as different',
  DIGIT_REV: 'Reversing a written number',
  WORD_GAP: 'Number words and amounts not matching',
  PLACE_SPLIT: 'Tens and ones as separate piles',
  STEADY: 'On track',
};

export const KID_LINE: Record<MisconceptionCode, string> = {
  COUNT_ALL: 'Let’s practice counting on from a number you already have.',
  OVERSHOOT: 'Let’s practice making the exact number — not too many.',
  SUB_FLIP: 'Let’s practice taking away the number the story asks for.',
  COMMUTE: '2 + 5 and 5 + 2 are the same trip. Let’s try that.',
  DIGIT_REV: 'Let’s write that number again, starting at the top.',
  WORD_GAP: 'Let’s hear the number and build that many together.',
  PLACE_SPLIT: 'Let’s group tens and ones as one number.',
  STEADY: 'You’re flying steady. Keep going to the next planet.',
};

export const TEACHER_LINE: Record<MisconceptionCode, string> = {
  COUNT_ALL: 'Recounts from 1 instead of counting on. Extra support before subtraction.',
  OVERSHOOT: 'Adds past the target and struggles to take back. Exact-total practice on Earth.',
  SUB_FLIP: 'Flips the subtraction direction. Stay on Saturn / Uranus stories.',
  COMMUTE: 'Does not yet treat addition as commutative. Mars equation builder.',
  DIGIT_REV: 'Written digits may be reversed (6/9, 2/5). On-device drawing check.',
  WORD_GAP: 'Number-word and quantity may not match. Use read-aloud on story planets.',
  PLACE_SPLIT: 'May split tens and ones. Watch Jupiter → Saturn transition.',
  STEADY: 'No strong misconception signal. Ready for the next unlocked planet.',
};

export const GLOW_PLANETS: Record<MisconceptionCode, PlanetId[]> = {
  COUNT_ALL: ['sun', 'mercury', 'venus'],
  OVERSHOOT: ['earth'],
  SUB_FLIP: ['saturn', 'uranus'],
  COMMUTE: ['mars', 'jupiter'],
  DIGIT_REV: ['earth', 'mercury'],
  WORD_GAP: ['jupiter', 'neptune'],
  PLACE_SPLIT: ['jupiter', 'saturn'],
  STEADY: [],
};

export const NEXT_PLANET: Record<MisconceptionCode, PlanetId> = {
  COUNT_ALL: 'mercury',
  OVERSHOOT: 'earth',
  SUB_FLIP: 'saturn',
  COMMUTE: 'mars',
  DIGIT_REV: 'earth',
  WORD_GAP: 'jupiter',
  PLACE_SPLIT: 'jupiter',
  STEADY: 'earth',
};

export const PRACTICE_TITLE: Record<MisconceptionCode, string> = {
  COUNT_ALL: 'Five minutes of counting on',
  OVERSHOOT: 'Exact totals with pencils',
  SUB_FLIP: 'Story subtraction, one direction',
  COMMUTE: 'Same sum, two orders',
  DIGIT_REV: 'Write 2, 5, 6, and 9 once each',
  WORD_GAP: 'Hear the number, then build it',
  PLACE_SPLIT: 'Tens and ones as one amount',
  STEADY: 'Continue on the next unlocked planet',
};

export const confidenceLabel = (confidence: number): string => {
  if (confidence >= 0.78) return 'High confidence';
  if (confidence >= 0.55) return 'Moderate confidence';
  return 'Low confidence — still gathering';
};
