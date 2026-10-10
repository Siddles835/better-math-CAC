/** Stop counting after a minute with no pointer, key, or touch input. */
export const IDLE_MS = 60_000;

export interface TimeCursor {
  cursor: number;
  lastInput: number;
}

export const localDayKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Foreground time only. Gaps after the idle cutoff are not stored.
 * Returns whole milliseconds to add, and a cursor moved to `now`.
 */
export const nextTimeSample = (
  sample: TimeCursor,
  now: number,
  visible: boolean
): { sample: TimeCursor; deltaMs: number } => {
  const from = sample.cursor;
  let delta = 0;
  if (visible && sample.lastInput > 0) {
    const end = Math.min(now, sample.lastInput + IDLE_MS);
    if (end > from) delta = end - from;
  }
  return { sample: { cursor: now, lastInput: sample.lastInput }, deltaMs: Math.max(0, delta) };
};
