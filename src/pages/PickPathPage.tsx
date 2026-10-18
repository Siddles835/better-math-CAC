import { tx } from '@/i18n/tx';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PATHS } from '@/content/catalog';
import { Button } from '@/components/ui/button';
import ReadAloudButton from '@/components/ReadAloudButton';
import {
  clearPendingPath,
  loadActiveLearner,
  normalizePathId,
  saveActiveLearner,
  savePendingPath,
} from '@/lib/paths/activeLearner';
import { switchPath } from '@/lib/paths/progress';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';
import { setSolarPathHint } from '@/lib/planets';
import { isSoloClassCode } from '@/lib/solo';
import { getActiveStudent } from '@/lib/session';

/**
 * Solo / practice only. Classroom students never pick a path —
 * there is one solar system; the teacher sets the starting planet.
 */
const PickPathPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'class' ? 'class' : params.get('mode') === 'switch' ? 'switch' : 'solo';
  const next = params.get('next');
  const [pathNow, setPathNow] = useState('');
  const [choosing, setChoosing] = useState(false);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      // Class join no longer uses this screen — send kids to the hub.
      if (mode === 'class') {
        navigate(STUDENT_HUB_PATH, { replace: true });
        return;
      }
      // Classroom switch is disabled; only solo may choose a pathway.
      const active = getActiveStudent();
      if (mode === 'switch' && active && !active.solo && !isSoloClassCode(active.classCode)) {
        navigate(STUDENT_HUB_PATH, { replace: true });
        return;
      }
      const loaded = await loadActiveLearner();
      if (cancel) return;
      if (loaded) setPathNow(normalizePathId(loaded.record.activePathId));
    })();
    return () => {
      cancel = true;
    };
  }, [mode, navigate]);

  const choose = async (pathId: string) => {
    if (choosing) return;
    setChoosing(true);
    try {
      const normalized = normalizePathId(pathId === 'all' ? 'foundations' : pathId);
      savePendingPath(normalized);
      setSolarPathHint(normalized);

      const wantsCheck = pathId === 'all' || next === 'check' || (mode === 'solo' && next !== 'hub');

      if (wantsCheck) {
        navigate(`/level-check?mode=solo&path=${normalized}`);
        return;
      }

      const loaded = await loadActiveLearner();
      if (loaded) {
        await saveActiveLearner(switchPath(loaded.record, normalized));
        clearPendingPath();
      }
      navigate(STUDENT_HUB_PATH, { replace: true });
    } catch (error) {
      console.error('Could not choose path', error);
      navigate(STUDENT_HUB_PATH, { replace: true });
    } finally {
      setChoosing(false);
    }
  };

  const welcomeKey = 'paths:pickLeadSolo';

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
                disabled={choosing}
                onClick={() => void choose(path.id)}
                className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-start min-h-[48px] disabled:opacity-60"
                style={{ borderColor: `hsl(${path.theme.accent})` }}
                aria-current={pathNow === path.id ? 'true' : undefined}
              >
                <span className="block text-lg font-semibold">{tx(path.titleKey)}</span>
                <span className="block text-sm text-muted-foreground">{tx(path.summaryKey)}</span>
              </button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full min-h-[48px]"
          data-testid="pick-not-sure"
          disabled={choosing}
          onClick={() => void choose('all')}
        >
          {tx('paths:notSure')}
        </Button>
      </div>
    </div>
  );
};

export default PickPathPage;
