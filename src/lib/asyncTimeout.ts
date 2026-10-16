/**
 * Bound an async call so navigation and hub loading cannot hang forever
 * when Firestore is slow or offline.
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
  label = 'operation'
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/** Resolve to fallback instead of throwing when the call fails or times out. */
export const withTimeoutFallback = async <T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label = 'operation'
): Promise<T> => {
  try {
    return await withTimeout(promise, ms, label);
  } catch (error) {
    console.warn(label, error);
    return fallback;
  }
};
