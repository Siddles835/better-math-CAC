import { tx } from '@/i18n/tx';
import React from 'react';
import { Link } from 'react-router-dom';

interface SiteChromeProps {
  children: React.ReactNode;
  wide?: boolean;
}

const SiteChrome: React.FC<SiteChromeProps> = ({ children, wide }) => {
  return (
    <div className="min-h-screen bg-background subtle-stars text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >{tx('ui:s_0a4470d64e')}</a>
      <header className="border-b border-border bg-card/80 backdrop-blur-sm print:hidden">
        <div
          className={`mx-auto px-6 py-4 flex items-center justify-between gap-4 ${
            wide ? 'max-w-5xl' : 'max-w-3xl'
          }`}
        >
          <Link to="/" className="text-sm font-medium text-primary hover:underline">{tx('ui:s_65f2f6d9a9')}</Link>
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
            <Link to="/classroom" className="text-foreground hover:underline">{tx('ui:s_902367725d')}</Link>
            <Link to="/how-it-works" className="text-foreground hover:underline">{tx('ui:s_1dd6a17cb4')}</Link>
            <Link to="/methods" className="text-foreground hover:underline">{tx('ui:s_7e4ac6803c')}</Link>
            <Link to="/try-practice" className="text-foreground hover:underline">{tx('ui:s_bcf651dd2d')}</Link>
          </nav>
        </div>
      </header>
      <main id="main" className={`mx-auto px-6 py-10 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
        {children}
      </main>
    </div>
  );
};

export default SiteChrome;
