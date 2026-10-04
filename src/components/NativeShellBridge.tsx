import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  flushSessionToNative,
  isNativeShell,
  nativeTabPathFor,
  postToNativeShell,
  requestNativeSessionRestore,
} from '@/lib/nativeShell';
import {
  ACTIVE_ROLE_KEY,
  ACTIVE_STUDENT_KEY,
  ACTIVE_TEACHER_KEY,
  LAST_CLASS_CODE_KEY,
  applyRestoredSessionValues,
  hasNoLocalSession,
  logSession,
  readSessionSnapshot,
} from '@/lib/session';

/**
 * The iOS SwiftUI shell posts CustomEvent('mathlift-navigate') when the native
 * tab bar / header wants to change routes inside the WKWebView.
 *
 * When the web app changes route itself (sign out, delete account, in-app
 * links), tell the native tab bar which tab should be highlighted.
 *
 * Also keeps Keychain write-through / defensive restore for background logout.
 */
const NativeShellBridge = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const path = (event as CustomEvent<{ path?: string }>).detail?.path;
      if (typeof path === 'string' && path.startsWith('/')) {
        navigate(path);
      }
    };
    window.addEventListener('mathlift-navigate', onNavigate as EventListener);
    return () => window.removeEventListener('mathlift-navigate', onNavigate as EventListener);
  }, [navigate]);

  useEffect(() => {
    const path = nativeTabPathFor(location.pathname);
    if (!path) return;
    postToNativeShell({ type: 'selectTab', path });
  }, [location.pathname]);

  // Write-through safety net + defensive Keychain restore (native shell only).
  useEffect(() => {
    const flush = (reason: string) => {
      if (!isNativeShell()) return;
      const snapshot = readSessionSnapshot();
      logSession('flush', reason, {
        student: Boolean(snapshot.student),
        teacher: Boolean(snapshot.teacher),
      });
      flushSessionToNative(snapshot);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush('visibilitychange-hidden');
      } else if (document.visibilityState === 'visible' && hasNoLocalSession()) {
        logSession('request-restore', 'visibilitychange-visible-empty');
        requestNativeSessionRestore();
      }
    };

    const onPageHide = () => flush('pagehide');

    const onNativeRestore = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, string | null | undefined>>).detail ?? {};
      applyRestoredSessionValues(
        {
          [ACTIVE_STUDENT_KEY]: detail.student ?? detail[ACTIVE_STUDENT_KEY],
          [ACTIVE_TEACHER_KEY]: detail.teacher ?? detail[ACTIVE_TEACHER_KEY],
          [ACTIVE_ROLE_KEY]: detail.role ?? detail[ACTIVE_ROLE_KEY],
          [LAST_CLASS_CODE_KEY]: detail.lastClassCode ?? detail[LAST_CLASS_CODE_KEY],
        },
        'native-bridge-restore'
      );
    };

    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('mathlift-session-restore', onNativeRestore as EventListener);

    // App start: if web storage is empty but Keychain may still hold a session.
    if (isNativeShell() && hasNoLocalSession()) {
      logSession('request-restore', 'app-start-empty');
      requestNativeSessionRestore();
    } else if (isNativeShell()) {
      flush('app-start-write-through');
    }

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('mathlift-session-restore', onNativeRestore as EventListener);
    };
  }, []);

  return null;
};

export default NativeShellBridge;
