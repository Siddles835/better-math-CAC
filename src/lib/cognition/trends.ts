import type { StudentState } from '@/lib/classroom';
import type { DiagnosisSnapshot } from './history';
import i18n from '@/i18n/setup';
import { misconceptionLabel } from './catalog';
import type { MisconceptionCode } from './types';
import type { PlanetId } from '@/lib/planets';

export const MISCONCEPTION_ORDER: MisconceptionCode[] = [
  'COUNT_ALL',
  'OVERSHOOT',
  'SUB_FLIP',
  'COMMUTE',
  'DIGIT_REV',
  'WORD_GAP',
  'PLACE_SPLIT',
  'STEADY',
];

/** Okabe-Ito, colorblind-safe. STEADY is blue, flagged patterns stay distinct. */
export const MISCONCEPTION_COLOR: Record<MisconceptionCode, string> = {
  STEADY: '#0072B2',
  COUNT_ALL: '#E69F00',
  OVERSHOOT: '#D55E00',
  SUB_FLIP: '#CC79A7',
  COMMUTE: '#009E73',
  DIGIT_REV: '#56B4E9',
  WORD_GAP: '#F0E442',
  PLACE_SPLIT: '#000000',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export interface ResolvedStudent {
  nickname: string;
  from: MisconceptionCode;
  resolvedAt: number;
}

const historyOf = (student: StudentState): DiagnosisSnapshot[] =>
  Array.isArray(student.diagnosisHistory) ? student.diagnosisHistory : [];

/**
 * Resolved: the student had a non-STEADY snapshot, and the latest run is
 * STEADY for at least two consecutive snapshots.
 * "This month" uses the timestamp of the second STEADY in that run.
 */
export const resolvedStudents = (students: StudentState[], now = Date.now()): ResolvedStudent[] => {
  const month = new Date(now);
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1).getTime();
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime();
  const found: ResolvedStudent[] = [];

  for (const student of students) {
    const history = [...historyOf(student)].sort((a, b) => a.at - b.at);
    if (history.length < 3) continue;
    let steadyRun = 0;
    let secondSteadyAt = 0;
    for (const snap of history) {
      if (snap.primary === 'STEADY') {
        steadyRun += 1;
        if (steadyRun === 2) secondSteadyAt = snap.at;
      } else {
        steadyRun = 0;
        secondSteadyAt = 0;
      }
    }
    if (steadyRun < 2) continue;
    const hadFlag = history.some((snap) => snap.primary !== 'STEADY');
    if (!hadFlag) continue;
    if (secondSteadyAt < monthStart || secondSteadyAt >= nextMonth) continue;
    const prior = [...history].reverse().find((snap) => snap.primary !== 'STEADY');
    found.push({
      nickname: student.nickname,
      from: prior?.primary ?? 'COUNT_ALL',
      resolvedAt: secondSteadyAt,
    });
  }

  return found;
};

export type TrendBucketUnit = 'week' | 'day';

export interface TrendBucket {
  key: string;
  label: string;
  start: number;
  counts: Record<MisconceptionCode, number>;
  carried: number;
}

export interface ClassTrend {
  unit: TrendBucketUnit;
  buckets: TrendBucket[];
  /** Distinct days that actually have a snapshot, before carry-forward. */
  observedDays: number;
  studentCount: number;
  enough: boolean;
}

const emptyCounts = (): Record<MisconceptionCode, number> => {
  const counts = {} as Record<MisconceptionCode, number>;
  for (const code of MISCONCEPTION_ORDER) counts[code] = 0;
  return counts;
};

const dayKey = (at: number) => {
  const date = new Date(at);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

/**
 * Class chart buckets. A student's value in a bucket is their latest snapshot
 * in that bucket. If they had no session, the previous value is carried forward.
 */
export const buildClassTrend = (students: StudentState[], now = Date.now()): ClassTrend => {
  const series = students
    .map((student) => [...historyOf(student)].sort((a, b) => a.at - b.at))
    .filter((history) => history.length > 0);

  const observed = new Set<string>();
  for (const history of series) {
    for (const snap of history) observed.add(dayKey(snap.at));
  }

  if (series.length === 0 || observed.size < 2) {
    return {
      unit: 'day',
      buckets: [],
      observedDays: observed.size,
      studentCount: students.length,
      enough: false,
    };
  }

  const first = Math.min(...series.map((history) => history[0].at));
  const last = Math.max(...series.map((history) => history[history.length - 1].at));
  const span = Math.max(0, last - first);
  const unit: TrendBucketUnit = span < 21 * DAY_MS ? 'day' : 'week';
  const step = unit === 'day' ? DAY_MS : WEEK_MS;
  const start = unit === 'day' ? new Date(first).setHours(0, 0, 0, 0) : first;

  const buckets: TrendBucket[] = [];
  for (let cursor = start; cursor <= last; cursor += step) {
    const end = cursor + step;
    const counts = emptyCounts();
    let carried = 0;
    for (const history of series) {
      const inBucket = history.filter((snap) => snap.at >= cursor && snap.at < end);
      const latest = inBucket[inBucket.length - 1];
      if (latest) {
        counts[latest.primary] += 1;
        continue;
      }
      const prior = [...history].reverse().find((snap) => snap.at < cursor);
      if (!prior) continue;
      counts[prior.primary] += 1;
      carried += 1;
    }
    const index = buckets.length + 1;
    const label =
      unit === 'day'
        ? new Date(cursor).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : `Week ${index}`;
    buckets.push({ key: `${unit}-${cursor}`, label, start: cursor, counts, carried });
  }

  return {
    unit,
    buckets,
    observedDays: observed.size,
    studentCount: students.length,
    enough: true,
  };
};

export const studentSummary = (student: StudentState): string => {
  const history = [...historyOf(student)].sort((a, b) => a.at - b.at);
  if (history.length === 0) return 'No sessions yet.';
  if (history.length === 1) {
    const only = history[0];
    return i18n.t('ui:trendOne', { pattern: misconceptionLabel(only.primary), planet: i18n.t(`ui:planet_${only.planet}`) });
  }

  let steadyRun = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].primary !== 'STEADY') break;
    steadyRun += 1;
  }
  const latest = history[history.length - 1];
  const firstFlag = history.find((snap) => snap.primary !== 'STEADY');
  if (steadyRun >= 2 && firstFlag) {
    return i18n.t('ui:trendSteady', {
      pattern: misconceptionLabel(firstFlag.primary),
      planet: i18n.t(`ui:planet_${firstFlag.planet}`),
      count: steadyRun,
    });
  }
  if (steadyRun === 1 && firstFlag) {
    return i18n.t('ui:trendSteadyOne', {
      pattern: misconceptionLabel(firstFlag.primary),
      planet: i18n.t(`ui:planet_${firstFlag.planet}`),
    });
  }

  const same = history.every((snap) => snap.primary === latest.primary);
  if (same) {
    return i18n.t('ui:trendStill', {
      pattern: misconceptionLabel(latest.primary),
      planet: i18n.t(`ui:planet_${latest.planet}`),
      count: history.length,
    });
  }
  const first = history[0];
  return i18n.t('ui:trendChanged', {
    before: misconceptionLabel(first.primary),
    planet: i18n.t(`ui:planet_${first.planet}`),
    after: misconceptionLabel(latest.primary),
  });
};

export const trendTableRows = (trend: ClassTrend): string[][] => {
  const header = [i18n.t('ui:trendBucket'), ...MISCONCEPTION_ORDER.map((code) => misconceptionLabel(code)), i18n.t('ui:trendCarried')];
  const rows = trend.buckets.map((bucket) => [
    bucket.label,
    ...MISCONCEPTION_ORDER.map((code) => String(bucket.counts[code])),
    String(bucket.carried),
  ]);
  return [header, ...rows];
};

export const planetName = (planet: PlanetId) => i18n.t(`ui:planet_${planet}`);
