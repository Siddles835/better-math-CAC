import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { nativeTabPathFor, postToNativeShell } from '@/lib/nativeShell';

/**
 * The iOS SwiftUI shell posts CustomEvent('mathlift-navigate') when the native
 * tab bar / header wants to change routes inside the WKWebView.
 *
 * When the web app changes route itself (sign out, delete account, in-app
 * links), tell the native tab bar which tab should be highlighted.
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

  return null;
};

export default NativeShellBridge;
