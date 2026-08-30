/** Talk to the MathLift iOS SwiftUI shell (WKWebView message handler `mathlift`). */

interface MathLiftWebKit {
  messageHandlers?: {
    mathlift?: { postMessage: (message: unknown) => void };
  };
}

export const postToNativeShell = (message: Record<string, unknown>): boolean => {
  if (typeof window === 'undefined') return false;
  const bridge = (window as { webkit?: MathLiftWebKit }).webkit?.messageHandlers?.mathlift;
  if (!bridge) return false;
  try {
    bridge.postMessage(message);
    return true;
  } catch {
    return false;
  }
};

/** Paths that correspond to the native Home / Classes / Settings tab bar. */
export const nativeTabPathFor = (pathname: string): string | null => {
  const withoutQuery = pathname.split('?')[0] ?? pathname;
  const trimmed = withoutQuery.replace(/\/+$/, '');
  const path = trimmed === '' ? '/' : trimmed;
  if (path === '/' || path === '/planets' || path === '/settings') {
    return path;
  }
  return null;
};
