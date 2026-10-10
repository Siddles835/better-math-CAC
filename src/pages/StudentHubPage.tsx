import { tx } from '@/i18n/tx';
import React, { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import PlanetSelectPage from '@/pages/PlanetSelectPage';
import SolarSystemPage from '@/pages/SolarSystemPage';
import PathBoardPage from '@/pages/PathBoardPage';
import { loadActiveLearner } from '@/lib/paths/activeLearner';
import { getPort } from '@/lib/data/port';
import { resolveAssignment } from '@/lib/curriculum/logic';

/** Phone: planet ring. iPad / desktop: orbital solar system. A chosen path, or a curriculum that replaces the default, uses the path board. */
const StudentHubPage: React.FC = () => {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<'loading' | 'board' | 'planets'>('loading');

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const loaded = await loadActiveLearner();
      if (cancel) return;
      const pathId = loaded?.record.activePathId ?? 'foundations';
      if (loaded && pathId !== 'foundations') {
        setMode('board');
        return;
      }
      if (loaded && !loaded.solo) {
        try {
          const port = getPort(loaded.classCode, false);
          const assignments = await port.listAssignments(loaded.classCode);
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
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (isMobile === undefined || mode === 'loading') {
    return (
      <div className="min-h-screen bg-background subtle-stars flex items-center justify-center">
        <div className="text-muted-foreground animate-fade-in">{tx('ui:s_a981d720b9')}</div>
      </div>
    );
  }

  if (mode === 'board') return <PathBoardPage />;

  return isMobile ? <PlanetSelectPage /> : <SolarSystemPage />;
};

export default StudentHubPage;
