import { tx } from '@/i18n/tx';
import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background subtle-stars p-8">
      <div className="text-center animate-fade-in max-w-md">
        <h1 className="mb-4 text-4xl font-bold text-foreground">{tx('ui:s_bc3023b360')}</h1>
        <p className="mb-6 text-lg text-muted-foreground">{tx('ui:s_39786d4146')}</p>
        <Link
          to="/"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        >{tx('ui:s_7d708367d6')}</Link>
      </div>
    </div>
  );
};

export default NotFound;
