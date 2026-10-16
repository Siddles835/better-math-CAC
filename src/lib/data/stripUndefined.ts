/** Deep-remove undefined from plain objects and arrays. Leaves null and primitives alone. */
export const stripUndefined = <T>(value: T): T => {
  if (value === undefined) return value;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefined(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry === undefined) continue;
    out[key] = stripUndefined(entry);
  }
  return out as T;
};

/** True when any nested value is undefined (including array holes via sparse maps). */
export const hasUndefined = (value: unknown): boolean => {
  if (value === undefined) return true;
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => hasUndefined(item));
  return Object.values(value as Record<string, unknown>).some((entry) => hasUndefined(entry));
};
