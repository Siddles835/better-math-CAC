import { tx } from '@/i18n/tx';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enableDemo, isDemoMode } from '@/lib/demo/mode';
import { resetDemoStore } from '@/lib/demo/store';

export const DemoBadge = () => {
  const navigate = useNavigate();
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (isDemoMode()) {
      enableDemo();
      setOn(true);
    }
  }, []);

  if (!on) return null;

  const reset = () => {
    resetDemoStore();
    navigate('/?demo=1', { replace: true });
    window.location.reload();
  };

  return (
    <div
      data-testid="demo-badge"
      role="status"
      className="fixed bottom-3 start-3 z-50 flex max-w-xs flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950 shadow"
    >
      <span>{tx('paths:demoBadge')}</span>
      <button type="button" data-testid="demo-reset" className="underline" onClick={reset}>
        {tx('paths:demoReset')}
      </button>
    </div>
  );
};

export const VersionMark = () => {
  const navigate = useNavigate();
  const [taps, setTaps] = useState(0);

  const tap = () => {
    const next = taps + 1;
    if (next >= 5) {
      enableDemo();
      navigate('/?demo=1');
      window.location.reload();
      return;
    }
    setTaps(next);
  };

  return (
    <button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={tap}>
      {tx('paths:versionLabel')}
    </button>
  );
};
