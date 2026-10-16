import { tx } from '@/i18n/tx';
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import PlanetSelectPage from '@/pages/PlanetSelectPage';
import SolarSystemPage from '@/pages/SolarSystemPage';
import PathBoardPage from '@/pages/PathBoardPage';
import { getPath } from '@/content/catalog';
import { loadActiveLearner, normalizePathId } from '@/lib/paths/activeLearner';
import { getPort } from '@/lib/data/port';
import { resolveAssignment } from '@/lib/curriculum/logic';
import { getActiveStudent } from '@/lib/session';
import { withTimeoutFallback } from '@/lib/asyncTimeout';

/**
 * Phone: planet ring. iPad / desktop: orbital solar system.
 * A chosen non-foundations path, or a curriculum that replaces the default,
 * uses the path board. Never stay stuck on the loading screen.
 */
const StudentHubPage: React.FC = () => {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<'loading' | 'board' | 'planets' | 'signed-out'>('loading');

  useEffect(() => {
    let cancel = false;
    // Absolute safety net: never leave kids on a blank loading screen.
    const failSafe = window.setTimeout(() => {
      if (!cancel) setMode(getActiveStudent() ? 'planets' : 'signed-out');
    }, 8000);

    void (async () => {
      try {
        if (!getActiveStudent()) {
          if (!cancel) setMode('signed-out');
          return;
        }
        const loaded = await loadActiveLearner();
        if (cancel) return;
        if (!loaded) {
          // Session exists but learner read failed: still show the solar system.
          setMode('planets');
          return;
        }
        const pathId = normalizePathId(loaded.record.activePathId);
        if (pathId !== 'foundations' && getPath(pathId)) {
          setMode('board');
          return;
        }
        if (!loaded.solo) {
          try {
            const port = getPort(loaded.classCode, false);
            const assignments = await withTimeoutFallback(
              port.listAssignments(loaded.classCode),
              4000,
              [],
              'listAssignments'
            );
            const chosen = resolveAssignment(assignments, loaded.studentKey, false);
            if (!cancel && chosen?.mode === 'replace') {
              setMode('board');
              return;
            }
          } catch {
            /* Keep the planet hub if the assignment list cannot be read. */
          }
        }
        if (!cancel) setMode('planets');
      } catch (error) {
        console.error('Student hub failed to load', error);
        if (!cancel) setMode(getActiveStudent() ? 'planets' : 'signed-out');
      }
    })();
    return () => {
      cancel = true;
      window.clearTimeout(failSafe);
    };
  }, []);

  if (mode === 'signed-out') {
    return <Navigate to="/student-login" replace />;
  }

  if (isMobile === undefined || mode === 'loading') {
    return (
      <div className="min-h-screen bg-background subtle-stars flex items-center justify-center" data-testid="hub-loading">
        <div className="text-muted-foreground animate-fade-in">{tx('ui:s_a981d720b9')}</div>
      </div>
    );
  }

  if (mode === 'board') return <PathBoardPage />;

  return isMobile ? <PlanetSelectPage /> : <SolarSystemPage />;
};

export default StudentHubPage;
