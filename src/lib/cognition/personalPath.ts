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
  | 'tens_ones'
  | 'compare'
  | 'neighbor';

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
  round: number;
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

const signature = (entry: PathItem) => `${entry.kind}:${entry.start}:${entry.add}:${entry.target}`;

const rangeFor = (accuracy: number, round: number): [number, number] => {
  const lift = Math.max(0, Math.min(4, Math.round(accuracy * 4) + Math.floor(round / 3)));
  const hi = [20, 40, 60, 80, 100][lift] ?? 20;
  return [1, hi];
};

const buildItems = (
  code: MisconceptionCode,
  rng: () => number,
  band: [number, number],
  blocked: Set<string>
): PathItem[] => {
  const hi = Math.max(10, band[1]);
  const small = Math.min(12, hi);
  const fresh = (entry: PathItem) => {
    if (!blocked.has(signature(entry))) return entry;
    return { ...entry, id: `${entry.id}b`, target: Math.min(hi, entry.target + 1) };
  };
  const pack = (entries: PathItem[]) => entries.map(fresh);

  if (code === 'COUNT_ALL') {
    const start = pickInt(rng, 2, Math.min(8, small));
    const add = pickInt(rng, 1, Math.min(4, hi - start));
    return pack([
      item('c1', 'count_on', '', '', start, add),
      item('c2', 'exact_total', '', '', 0, Math.min(small, start + add), { target: Math.min(small, start + add), hardStop: true }),
      item('c3', 'hear_build', '', '', 0, 0, { target: pickInt(rng, 1, small) }),
      item('c4', 'count_on', '', '', pickInt(rng, 3, Math.min(15, hi - 1)), pickInt(rng, 1, 3)),
      item('c5', 'neighbor', '', '', pickInt(rng, 1, hi - 1), 1, { target: 0 }),
      item('c6', 'compare', '', '', pickInt(rng, 1, hi), pickInt(rng, 1, hi)),
    ]).map((entry) =>
      entry.kind === 'neighbor' ? { ...entry, target: entry.start + 1 } : entry.kind === 'compare'
        ? { ...entry, target: Math.max(entry.start, entry.add) }
        : entry
    );
  }

  if (code === 'OVERSHOOT') {
    const targets = [0, 1, 2, 3, 4, 5].map(() => pickInt(rng, 3, Math.min(20, hi)));
    return pack([
      item('o1', 'exact_total', '', '', 0, targets[0], { target: targets[0], hardStop: true }),
      item('o2', 'exact_total', '', '', 0, targets[1], { target: targets[1], hardStop: true }),
      item('o3', 'count_on', '', '', Math.max(1, targets[2] - 2), 2, { target: targets[2] }),
      item('o4', 'tens_ones', '', '', 10 * pickInt(rng, 1, Math.max(1, Math.floor(hi / 10))), pickInt(rng, 0, 9)),
      item('o5', 'neighbor', '', '', pickInt(rng, 1, hi - 1), 1),
      item('o6', 'compare', '', '', pickInt(rng, 1, hi), pickInt(rng, 1, hi)),
    ]).map((entry) => {
      if (entry.kind === 'tens_ones') return { ...entry, target: entry.start + entry.add };
      if (entry.kind === 'neighbor') return { ...entry, target: entry.start + 1 };
      if (entry.kind === 'compare') return { ...entry, target: Math.max(entry.start, entry.add) };
      return entry;
    });
  }

  if (code === 'SUB_FLIP') {
    const have = pickInt(rng, 5, Math.min(20, hi));
    const take = pickInt(rng, 1, Math.min(4, have - 1));
    return pack([
      item('s1', 'take_away', '', '', have, take, { target: have - take }),
      item('s2', 'take_away', '', '', pickInt(rng, 6, Math.min(18, hi)), pickInt(rng, 1, 3)),
      item('s3', 'exact_total', '', '', 0, pickInt(rng, 2, small), { target: pickInt(rng, 2, small) }),
      item('s4', 'neighbor', '', '', pickInt(rng, 2, hi), -1),
      item('s5', 'compare', '', '', pickInt(rng, 1, hi), pickInt(rng, 1, hi)),
      item('s6', 'write_digit', '', '', 0, 0, { digit: pickInt(rng, 0, 9), target: 0 }),
    ]).map((entry) => {
      if (entry.kind === 'take_away') return { ...entry, target: entry.start - entry.add };
      if (entry.kind === 'neighbor') return { ...entry, target: Math.max(0, entry.start + entry.add) };
      if (entry.kind === 'compare') return { ...entry, target: Math.max(entry.start, entry.add) };
      if (entry.kind === 'write_digit') return { ...entry, target: entry.digit ?? 0 };
      return entry;
    });
  }

  if (code === 'COMMUTE') {
    const a = pickInt(rng, 1, Math.min(9, small));
    let b = pickInt(rng, 1, Math.min(9, small));
    if (b === a) b = Math.min(small, a + 1);
    return pack([
      item('m1', 'same_sum', '', '', a, b, { target: a + b }),
      item('m2', 'same_sum', '', '', b, a, { target: a + b }),
      item('m3', 'exact_total', '', '', 0, a + b, { target: a + b }),
      item('m4', 'count_on', '', '', a, b),
      item('m5', 'compare', '', '', a + b, b + a, { target: a + b }),
      item('m6', 'neighbor', '', '', a + b, 1, { target: a + b + 1 }),
    ]);
  }

  if (code === 'DIGIT_REV') {
    const digits = [2, 5, 6, 9, pickInt(rng, 0, 9), pickInt(rng, 10, Math.min(99, hi))];
    return digits.map((digit, index) =>
      fresh(item(`d${index + 1}`, 'write_digit', '', '', 0, 0, { digit, target: digit }))
    );
  }

  if (code === 'WORD_GAP') {
    const nums = [1, 2, 3, 4, 5, 6].map(() => pickInt(rng, 1, Math.min(20, hi)));
    return pack(nums.map((n, index) => item(`w${index + 1}`, index === 5 ? 'exact_total' : 'hear_build', '', '', 0, n, { target: n })));
  }

  if (code === 'PLACE_SPLIT') {
    const tens = pickInt(rng, 1, Math.max(1, Math.floor(hi / 10)));
    const ones = pickInt(rng, 0, 9);
    const tens2 = pickInt(rng, 1, Math.max(1, Math.floor(hi / 10)));
    const ones2 = pickInt(rng, 0, 9);
    return pack([
      item('p1', 'tens_ones', '', '', tens * 10, ones, { target: tens * 10 + ones }),
      item('p2', 'tens_ones', '', '', tens2 * 10, ones2, { target: tens2 * 10 + ones2 }),
      item('p3', 'exact_total', '', '', 0, tens * 10 + ones, { target: tens * 10 + ones }),
      item('p4', 'write_digit', '', '', 0, 0, { digit: tens * 10 + ones, target: tens * 10 + ones }),
      item('p5', 'compare', '', '', tens * 10 + ones, tens2 * 10 + ones2),
      item('p6', 'neighbor', '', '', tens * 10, 1, { target: tens * 10 + 1 }),
    ]).map((entry) => (entry.kind === 'compare' ? { ...entry, target: Math.max(entry.start, entry.add) } : entry));
  }

  const start = pickInt(rng, 1, Math.min(10, hi));
  const add = pickInt(rng, 1, Math.min(5, hi - start));
  return pack([
    item('st1', 'count_on', '', '', start, add),
    item('st2', 'exact_total', '', '', 0, pickInt(rng, 2, small), { target: pickInt(rng, 2, small) }),
    item('st3', 'same_sum', '', '', 2, 4, { target: 6 }),
    item('st4', 'take_away', '', '', pickInt(rng, 4, Math.min(12, hi)), 2),
    item('st5', 'compare', '', '', pickInt(rng, 1, hi), pickInt(rng, 1, hi)),
    item('st6', 'neighbor', '', '', pickInt(rng, 1, hi - 1), 1),
  ]).map((entry) => {
    if (entry.kind === 'take_away') return { ...entry, target: entry.start - entry.add };
    if (entry.kind === 'neighbor') return { ...entry, target: entry.start + 1 };
    if (entry.kind === 'compare') return { ...entry, target: Math.max(entry.start, entry.add) };
    return entry;
  });
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

const MEMORY_KEY = 'mathlift.practice.recent';

export interface PracticeBuildOptions {
  round?: number;
  entropy?: number;
  recent?: string[];
  accuracy?: number;
  demo?: boolean;
  maxNumber?: number;
}

export const itemSignature = (entry: PathItem) => `${entry.kind}:${entry.start}:${entry.add}:${entry.target}`;

export const loadPracticeMemory = (): { recent: string[]; accuracy: number; round: number } => {
  if (typeof localStorage === 'undefined') return { recent: [], accuracy: 0, round: 0 };
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return { recent: [], accuracy: 0, round: 0 };
    const parsed = JSON.parse(raw) as { recent?: string[]; accuracy?: number; round?: number };
    return {
      recent: Array.isArray(parsed.recent) ? parsed.recent.slice(-18) : [],
      accuracy: typeof parsed.accuracy === 'number' ? parsed.accuracy : 0,
      round: typeof parsed.round === 'number' ? parsed.round : 0,
    };
  } catch {
    return { recent: [], accuracy: 0, round: 0 };
  }
};

export const savePracticeMemory = (recent: string[], accuracy: number, round: number) => {
  if (typeof localStorage === 'undefined') return;
  const next = { recent: recent.slice(-18), accuracy, round };
  localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
};

export const buildPersonalPath = (
  nickname: string,
  diagnosis: Diagnosis | null,
  dayKey?: string,
  options: PracticeBuildOptions = {}
): PersonalPath => {
  const code = diagnosis?.primary ?? 'STEADY';
  const day = dayKey ?? new Date().toISOString().slice(0, 10);
  const round = options.round ?? 0;
  const entropy = options.demo ? round % 5 : (options.entropy ?? 0);
  const seed = hashSeed(`${nickname.toLowerCase()}|${code}|${options.demo ? 'sample' : day}|${round}|${entropy}`);
  const rng = mulberry32(seed);
  const band = rangeFor(options.accuracy ?? 0, round);
  if (options.maxNumber) band[1] = Math.min(band[1], options.maxNumber);
  const blocked = new Set(options.recent ?? []);
  const items = buildItems(code, rng, band, blocked);
  const cover = (round % band[1]) + 1;
  const last = items[items.length - 1];
  items[items.length - 1] = {
    ...last,
    id: `${last.id}-cover`,
    kind: 'write_digit',
    prompt: '',
    speak: '',
    start: 0,
    add: 0,
    digit: cover,
    target: cover,
  };
  return {
    code,
    title: TITLES[code],
    why: diagnosis?.kidLine ?? KID_LINE[code],
    seed,
    round,
    items,
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
