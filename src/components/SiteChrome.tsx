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
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-card/80 backdrop-blur-sm print:hidden">
        <div
          className={`mx-auto px-6 py-4 flex items-center justify-between gap-4 ${
            wide ? 'max-w-5xl' : 'max-w-3xl'
          }`}
        >
          <Link to="/" className="text-sm font-medium text-primary hover:underline">
            Back to MathLift
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
            <Link to="/classroom" className="text-foreground hover:underline">
              Sample classroom
            </Link>
            <Link to="/how-it-works" className="text-foreground hover:underline">
              How it works
            </Link>
            <Link to="/methods" className="text-foreground hover:underline">
              Methods
            </Link>
            <Link to="/try-practice" className="text-foreground hover:underline">
              Try a practice
            </Link>
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
