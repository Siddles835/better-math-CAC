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

/** Ask the iOS shell to print. Browsers fall back to window.print(). */
export const requestPrint = (): void => {
  const sent = postToNativeShell({ type: 'print' });
  if (!sent && typeof window !== 'undefined') window.print();
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
