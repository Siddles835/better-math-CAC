import { tx } from '@/i18n/tx';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PATHS } from '@/content/catalog';
import { Button } from '@/components/ui/button';
import ReadAloudButton from '@/components/ReadAloudButton';
import { getClass } from '@/lib/classroom';
import { isDemoMode } from '@/lib/demo/mode';
import { loadActiveLearner, saveActiveLearner, savePendingPath } from '@/lib/paths/activeLearner';
import { switchPath } from '@/lib/paths/progress';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';

const PickPathPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'class' ? 'class' : params.get('mode') === 'switch' ? 'switch' : 'solo';
  const next = params.get('next');
  const [placementOn, setPlacementOn] = useState(mode !== 'class');
  const [pathNow, setPathNow] = useState('');

  useEffect(() => {
    let cancel = false;
    void (async () => {
      if (mode === 'class' || mode === 'switch') {
        const loaded = await loadActiveLearner();
        if (cancel) return;
        if (loaded) setPathNow(loaded.record.activePathId);
        if (mode === 'class' && loaded) {
          const cls = await getClass(loaded.classCode);
          if (!cancel) setPlacementOn(!!cls?.usePlacementCheck || isDemoMode());
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [mode]);

  const choose = async (pathId: string) => {
    savePendingPath(pathId);
    if (pathId !== 'all') {
      const loaded = await loadActiveLearner();
      if (loaded) {
        await saveActiveLearner(switchPath(loaded.record, pathId));
      }
    }
    const wantsCheck = pathId === 'all' || next === 'check' || (mode === 'class' && placementOn) || (mode === 'solo' && next !== 'hub');
    if (pathId === 'all' || wantsCheck) {
      const checkPath = pathId === 'all' ? 'all' : pathId;
      navigate(`/level-check?mode=${mode === 'class' ? 'class' : 'solo'}&path=${checkPath}`);
      return;
    }
    navigate(STUDENT_HUB_PATH, { replace: true });
  };

  const welcomeKey =
    'paths:pickLead';

  return (
    <div className="min-h-screen bg-background subtle-stars p-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-3xl font-semibold">{tx('paths:pickTitle')}</h1>
          <ReadAloudButton text={`${tx('paths:pickTitle')}. ${tx(welcomeKey)}`} />
        </div>
        <p className="mb-6 text-muted-foreground">{tx(welcomeKey)}</p>
        <ul className="space-y-3">
          {PATHS.map((path) => (
            <li key={path.id}>
              <button
                type="button"
                data-testid={`pick-${path.id}`}
                onClick={() => void choose(path.id)}
                className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-start min-h-[48px]"
                style={{ borderColor: `hsl(${path.theme.accent})` }}
                aria-current={pathNow === path.id ? 'true' : undefined}
              >
                <span className="block text-lg font-semibold">{tx(path.titleKey)}</span>
                <span className="block text-sm text-muted-foreground">{tx(path.summaryKey)}</span>
              </button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" className="mt-6 w-full min-h-[48px]" data-testid="pick-not-sure" onClick={() => void choose('all')}>
          {tx('paths:notSure')}
        </Button>
      </div>
    </div>
  );
};

export default PickPathPage;
