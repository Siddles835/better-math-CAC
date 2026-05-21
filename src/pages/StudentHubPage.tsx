import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import PlanetSelectPage from '@/pages/PlanetSelectPage';
import SolarSystemPage from '@/pages/SolarSystemPage';

/** Phone: planet ring. iPad / desktop: orbital solar system. */
const StudentHubPage: React.FC = () => {
  const isMobile = useIsMobile();
  return isMobile ? <PlanetSelectPage /> : <SolarSystemPage />;
};

export default StudentHubPage;
