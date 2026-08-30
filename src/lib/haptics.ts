// Tactile feedback helpers (App Store Guideline 4.2 — native experience).
//
// Three delivery paths, tried in order:
// 1. The MathLift iOS shell (plain WKWebView) exposes
//    window.webkit.messageHandlers.mathlift — the native side fires the
//    Taptic Engine (UIImpactFeedbackGenerator / UINotificationFeedbackGenerator).
// 2. The Capacitor Haptics plugin when running inside the Capacitor app.
// 3. navigator.vibrate on the plain mobile web.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

type HapticStyle = 'light' | 'medium' | 'success' | 'error';

interface MathLiftWebKit {
  messageHandlers?: {
    mathlift?: { postMessage: (message: unknown) => void };
  };
}

const iosShellBridge = () => {
  if (typeof window === 'undefined') return null;
  const webkit = (window as { webkit?: MathLiftWebKit }).webkit;
  return webkit?.messageHandlers?.mathlift ?? null;
};

const canVibrateOnWeb = () =>
  typeof navigator !== 'undefined' && 'vibrate' in navigator;

const trigger = (style: HapticStyle) => {
  const bridge = iosShellBridge();
  if (bridge) {
    try {
      bridge.postMessage({ type: 'haptic', style });
    } catch {
      // Native handler missing — nothing else to do.
    }
    return;
  }

  if (Capacitor.isNativePlatform()) {
    switch (style) {
      case 'success':
        Haptics.notification({ type: NotificationType.Success }).catch(() => {});
        return;
      case 'error':
        Haptics.notification({ type: NotificationType.Error }).catch(() => {});
        return;
      case 'medium':
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
        return;
      default:
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        return;
    }
  }

  if (canVibrateOnWeb()) {
    const pattern =
      style === 'success' ? [30, 40, 30] : style === 'error' ? [15] : style === 'medium' ? [25] : [10];
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration unsupported or blocked — silently skip.
    }
  }
};

/** Pleasant, distinct pulse when the student gets something right. */
export const hapticSuccess = () => trigger('success');

/** Subtle, soft pulse for incorrect attempts (never jarring). */
export const hapticError = () => trigger('error');

/** Light "click" when a manipulative (apple, pencil, number chip) snaps into place. */
export const hapticTap = () => trigger('light');

/** Medium tap for bigger moments (finishing a planet, launching the rocket). */
export const hapticMedium = () => trigger('medium');
