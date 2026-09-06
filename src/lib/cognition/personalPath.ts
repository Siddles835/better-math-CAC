import type { Diagnosis, MisconceptionCode } from './types';
import type { PlanetId } from '@/lib/planets';
import { KID_LINE } from './catalog';

export type PathKind =
  | 'count_on'
  | 'exact_total'
  | 'take_away'
  | 'same_sum'
  | 'write_digit'
  | 'hear_build'
  | 'tens_ones';

export interface PathItem {
  id: string;
  kind: PathKind;
  prompt: string;
  speak: string;
  start: number;
  add: number;
  target: number;
  digit?: number;
  hardStop?: boolean;
}

export interface PersonalPath {
  code: MisconceptionCode;
  title: string;
  why: string;
  seed: number;
  items: PathItem[];
}

export interface ItemOutcome {
  correct: boolean;
  overshoot: boolean;
  reversal: boolean;
}

const TITLES: Record<MisconceptionCode, string> = {
  COUNT_ALL: 'Count on from a number you already have',
  OVERSHOOT: 'Make the exact number',
  SUB_FLIP: 'Take away the number the story asks for',
  COMMUTE: 'Same total, two orders',
  DIGIT_REV: 'Write the number, starting at the top',
  WORD_GAP: 'Hear the number, then build it',
  PLACE_SPLIT: 'Tens and ones as one number',
  STEADY: 'A short stretch from last time',
};

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
];

const hashSeed = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pickInt = (rng: () => number, lo: number, hi: number) =>
  lo + Math.floor(rng() * (hi - lo + 1));

const item = (
  id: string,
  kind: PathKind,
  prompt: string,
  speak: string,
  start: number,
  add: number,
  extra?: Partial<PathItem>
): PathItem => ({
  id,
  kind,
  prompt,
  speak,
  start,
  add,
  target: extra?.target ?? start + add,
  ...extra,
});

const buildItems = (code: MisconceptionCode, rng: () => number): PathItem[] => {
  if (code === 'COUNT_ALL') {
    const start = pickInt(rng, 3, 6);
    const add = pickInt(rng, 1, Math.min(3, 9 - start));
    const start2 = pickInt(rng, 4, 6);
    const add2 = pickInt(rng, 2, Math.min(3, 9 - start2));
    return [
      item(
        'c1',
        'count_on',
        `You already have ${start}. Tap to add ${add} more. Do not start over at one.`,
        `You already have ${start}. Add ${add} more.`,
        start,
        add
      ),
      item(
        'c2',
        'count_on',
        `Start from ${start2}. Count on ${add2}.`,
        `Start from ${start2}. Count on ${add2}.`,
        start2,
        add2
      ),
      item(
        'c3',
        'exact_total',
        `Make exactly ${start + add}. Stop when you get there.`,
        `Make exactly ${start + add}.`,
        0,
        start + add,
        { target: start + add, hardStop: true }
      ),
    ];
  }

  if (code === 'OVERSHOOT') {
    const t1 = pickInt(rng, 4, 7);
    const t2 = pickInt(rng, 5, 8);
    const t3 = pickInt(rng, 4, 6);
    return [
      item('o1', 'exact_total', `Make exactly ${t1}. Not one more.`, `Make exactly ${t1}.`, 0, t1, {
        target: t1,
      }),
      item('o2', 'exact_total', `Make exactly ${t2}. Stop on ${t2}.`, `Make exactly ${t2}.`, 0, t2, {
        target: t2,
        hardStop: true,
      }),
      item(
        'o3',
        'count_on',
        `You have ${t3 - 2}. Add only what you need to reach ${t3}.`,
        `You have ${t3 - 2}. Reach ${t3}.`,
        t3 - 2,
        2,
        { target: t3 }
      ),
    ];
  }

  if (code === 'SUB_FLIP') {
    const have = pickInt(rng, 6, 9);
    const take = pickInt(rng, 1, 3);
    const have2 = pickInt(rng, 5, 8);
    const take2 = pickInt(rng, 1, Math.min(3, have2 - 2));
    return [
      item(
        's1',
        'take_away',
        `You have ${have}. Take away ${take}.`,
        `You have ${have}. Take away ${take}.`,
        have,
        take,
        { target: have - take }
      ),
      item(
        's2',
        'take_away',
        `The story says take away ${take2} from ${have2}.`,
        `Take away ${take2} from ${have2}.`,
        have2,
        take2,
        { target: have2 - take2 }
      ),
      item(
        's3',
        'take_away',
        `Start with ${have}. Take away ${take}. Check what is left.`,
        `Start with ${have}. Take away ${take}.`,
        have,
        take,
        { target: have - take }
      ),
    ];
  }

  if (code === 'COMMUTE') {
    const a = pickInt(rng, 2, 4);
    let b = pickInt(rng, 2, 5);
    if (b === a) b = a + 1;
    return [
      item(
        'm1',
        'same_sum',
        `Put ${a}, then ${b}. The total is the same as ${b} then ${a}.`,
        `${a} plus ${b} is the same as ${b} plus ${a}.`,
        a,
        b,
        { target: a + b }
      ),
      item(
        'm2',
        'same_sum',
        `Now start with the bigger group. Put ${b}, then ${a}.`,
        `Put ${b}, then ${a}.`,
        b,
        a,
        { target: a + b }
      ),
      item(
        'm3',
        'exact_total',
        `Build ${a + b} any way you like.`,
        `Build ${a + b}.`,
        0,
        a + b,
        { target: a + b }
      ),
    ];
  }

  if (code === 'DIGIT_REV') {
    const digits = [6, 9, 2, 5];
    const d1 = digits[pickInt(rng, 0, 3)];
    const pair: Record<number, number> = { 6: 9, 9: 6, 2: 5, 5: 2 };
    const d2 = pair[d1];
    const d3 = digits[pickInt(rng, 0, 3)];
    return [
      item('d1', 'write_digit', `Write ${d1}. Start at the top.`, `Write ${d1}.`, 0, 0, {
        target: d1,
        digit: d1,
      }),
      item('d2', 'write_digit', `Now write ${d2}.`, `Write ${d2}.`, 0, 0, {
        target: d2,
        digit: d2,
      }),
      item('d3', 'write_digit', `Write ${d3} once more.`, `Write ${d3}.`, 0, 0, {
        target: d3,
        digit: d3,
      }),
    ];
  }

  if (code === 'WORD_GAP') {
    const n1 = pickInt(rng, 3, 7);
    const n2 = pickInt(rng, 4, 8);
    const n3 = pickInt(rng, 3, 6);
    return [
      item(
        'w1',
        'hear_build',
        `Listen: ${NUMBER_WORDS[n1]}. Build that many.`,
        NUMBER_WORDS[n1],
        0,
        n1,
        { target: n1 }
      ),
      item(
        'w2',
        'hear_build',
        `Listen: ${NUMBER_WORDS[n2]}. Build that many.`,
        NUMBER_WORDS[n2],
        0,
        n2,
        { target: n2 }
      ),
      item(
        'w3',
        'exact_total',
        `Make ${n3} without the word this time.`,
        `Make ${n3}.`,
        0,
        n3,
        { target: n3 }
      ),
    ];
  }

  if (code === 'PLACE_SPLIT') {
    const ones = pickInt(rng, 1, 4);
    const ones2 = pickInt(rng, 2, 4);
    return [
      item(
        'p1',
        'tens_ones',
        `One ten and ${ones} one${ones === 1 ? '' : 's'} is ${10 + ones}.`,
        `One ten and ${ones} is ${10 + ones}.`,
        10,
        ones,
        { target: 10 + ones }
      ),
      item(
        'p2',
        'tens_ones',
        `One ten and ${ones2} ones. How many in all?`,
        `One ten and ${ones2}. How many in all?`,
        10,
        ones2,
        { target: 10 + ones2 }
      ),
      item(
        'p3',
        'exact_total',
        `Build ${10 + ones} as one group.`,
        `Build ${10 + ones}.`,
        0,
        10 + ones,
        { target: 10 + ones }
      ),
    ];
  }

  const t = pickInt(rng, 5, 8);
  const start = pickInt(rng, 3, 5);
  const add = pickInt(rng, 2, Math.min(3, 9 - start));
  return [
    item('st1', 'count_on', `Count on from ${start}. Add ${add}.`, `Count on ${add} from ${start}.`, start, add),
    item('st2', 'exact_total', `Make exactly ${t}.`, `Make exactly ${t}.`, 0, t, { target: t }),
    item(
      'st3',
      'same_sum',
      `2 + 4 and 4 + 2 are the same trip.`,
      `2 plus 4 is the same as 4 plus 2.`,
      2,
      4,
      { target: 6 }
    ),
  ];
};

export const STARTER_HINT: Diagnosis = {
  primary: 'STEADY',
  confidence: 0.4,
  scores: [],
  glowPlanets: [],
  nextPlanet: 'sun' as PlanetId,
  kidLine: 'Three short problems, built for you on this device.',
  teacherLine: '',
  earlyWarning: null,
  updatedAt: 0,
};

export const buildPersonalPath = (
  nickname: string,
  diagnosis: Diagnosis | null,
  dayKey?: string
): PersonalPath => {
  const code = diagnosis?.primary ?? 'STEADY';
  const day = dayKey ?? new Date().toISOString().slice(0, 10);
  const seed = hashSeed(`${nickname.toLowerCase()}|${code}|${day}`);
  const rng = mulberry32(seed);
  return {
    code,
    title: TITLES[code],
    why: diagnosis?.kidLine ?? KID_LINE[code],
    seed,
    items: buildItems(code, rng),
  };
};

/** After a miss, later items get a tighter constraint — still on-device. */
export const adaptPath = (path: PersonalPath, index: number, outcome: ItemOutcome): PersonalPath => {
  if (outcome.correct) return path;
  const items = path.items.map((entry, i) => {
    if (i <= index) return entry;
    if (outcome.overshoot && entry.kind === 'exact_total') {
      return { ...entry, hardStop: true, prompt: `Make exactly ${entry.target}. Stop on ${entry.target}.` };
    }
    if (outcome.reversal && entry.kind === 'write_digit' && entry.digit != null) {
      const pair: Record<number, number> = { 6: 9, 9: 6, 2: 5, 5: 2 };
      const next = pair[entry.digit] ?? entry.digit;
      return {
        ...entry,
        digit: next,
        target: next,
        prompt: `Write ${next}. Start at the top.`,
        speak: `Write ${next}.`,
      };
    }
    if (entry.kind === 'count_on' && entry.add > 1) {
      return {
        ...entry,
        start: Math.min(7, entry.start + 1),
        add: entry.add - 1,
        target: Math.min(7, entry.start + 1) + (entry.add - 1),
        prompt: `You already have ${Math.min(7, entry.start + 1)}. Add ${entry.add - 1}.`,
      };
    }
    return entry;
  });
  return { ...path, items };
};
