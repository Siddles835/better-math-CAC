import { tx } from '@/i18n/tx';
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import PlanetSelectPage from '@/pages/PlanetSelectPage';
import SolarSystemPage from '@/pages/SolarSystemPage';

/** Phone: planet ring. iPad / desktop: orbital solar system. */
const StudentHubPage: React.FC = () => {
  const isMobile = useIsMobile();

  // Avoid flashing the wrong hub layout before the viewport is measured.
  if (isMobile === undefined) {
    return (
      <div className="min-h-screen bg-background subtle-stars flex items-center justify-center">
        <div className="text-muted-foreground animate-fade-in">{tx('ui:s_a981d720b9')}</div>
      </div>
    );
  }

  return isMobile ? <PlanetSelectPage /> : <SolarSystemPage />;
};

export default StudentHubPage;
