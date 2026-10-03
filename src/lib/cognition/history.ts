import type { PlanetId } from '@/lib/planets';
import type { MisconceptionCode } from './types';

/** Small on-device summary kept for the teacher trend view. No drawings or free text. */
export interface DiagnosisSnapshot {
  at: number;
  planet: PlanetId;
  primary: MisconceptionCode;
  confidence: number;
}

export const DIAGNOSIS_HISTORY_CAP = 40;
const DUPLICATE_WINDOW_MS = 60_000;

/**
 * Append one snapshot. Drops the oldest past 40.
 * Skips a repeat of the same planet and misconception within 60 seconds.
 * Missing history (older student documents) is treated as empty.
 */
export const appendDiagnosisSnapshot = (
  history: DiagnosisSnapshot[] | undefined,
  snapshot: DiagnosisSnapshot
): DiagnosisSnapshot[] => {
  const prev = Array.isArray(history) ? history : [];
  const last = prev[prev.length - 1];
  if (
    last &&
    snapshot.at - last.at < DUPLICATE_WINDOW_MS &&
    snapshot.at >= last.at &&
    last.primary === snapshot.primary &&
    last.planet === snapshot.planet
  ) {
    return prev;
  }
  const next = [...prev, snapshot];
  if (next.length <= DIAGNOSIS_HISTORY_CAP) return next;
  return next.slice(next.length - DIAGNOSIS_HISTORY_CAP);
};
