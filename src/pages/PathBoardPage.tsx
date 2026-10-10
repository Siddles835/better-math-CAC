import { tx } from '@/i18n/tx';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPathOrFoundations } from '@/content/catalog';
import type { Curriculum, LearnerRecord } from '@/content/types';
import { getPort } from '@/lib/data/port';
import { resolveAssignment } from '@/lib/curriculum/logic';
import { isNodeUnlocked, progressFor } from '@/lib/paths/progress';
import { loadActiveLearner } from '@/lib/paths/activeLearner';
import { getLessonRoute } from '@/lib/planets';
import type { PlanetId } from '@/lib/planets';
import { Button } from '@/components/ui/button';

const PathBoardPage = () => {
  const navigate = useNavigate();
  const [record, setRecord] = useState<LearnerRecord | null>(null);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [mode, setMode] = useState<'replace' | 'alongside' | null>(null);
  const [solo, setSolo] = useState(false);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const loaded = await loadActiveLearner();
      if (!loaded || cancel) return;
      setRecord(loaded.record);
      setSolo(loaded.solo);
      if (loaded.solo) return;
      const port = getPort(loaded.classCode, false);
      const assignments = await port.listAssignments(loaded.classCode);
      const chosen = resolveAssignment(assignments, loaded.studentKey, false);
      if (!chosen) return;
      const curricula = await port.listCurricula(loaded.classCode);
      const found = curricula.find((item) => item.id === chosen.curriculumId) ?? null;
      if (cancel) return;
      setCurriculum(found);
      setMode(found ? chosen.mode : null);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (!record) {
    return <div className="min-h-screen bg-background p-8 text-muted-foreground">{tx('paths:noneYet')}</div>;
  }

  const path = getPathOrFoundations(record.activePathId);
  const progress = progressFor(record, path.id);
  const showPath = mode !== 'replace';
  const showCurriculum = !!curriculum && !solo;

  return (
    <div className="min-h-screen bg-background subtle-stars p-6" style={{ ['--path-accent' as string]: path.theme.accent }}>
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">{tx(path.titleKey)}</h1>
          <Button type="button" variant="outline" className="min-h-[48px]" onClick={() => navigate('/pick-path?mode=switch&next=hub')}>
            {tx('paths:openPaths')}
          </Button>
        </div>
        {showPath && (
          <ul className="space-y-3">
            {path.nodes.map((node) => {
              const unlocked = isNodeUnlocked(path, progress, node.id);
              const mastered = !!progress.nodeMastery[node.id]?.mastered || progress.completedNodeIds.includes(node.id);
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    disabled={!unlocked}
                    className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-start min-h-[48px] disabled:opacity-50"
                    onClick={() => {
                      if (node.source.kind === 'legacy') navigate(getLessonRoute(node.source.planetId as PlanetId));
                      else navigate(`/play/${path.id}/${node.id}`);
                    }}
                  >
                    <span className="font-semibold">{node.title ? node.title : tx(node.titleKey)}</span>
                    <span className="ms-2 text-sm text-muted-foreground">{mastered ? tx('paths:playMastered') : unlocked ? '' : tx('paths:playLocked')}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {showCurriculum && curriculum && (
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-semibold">{curriculum.name}</h2>
            <ul className="space-y-3">
              {curriculum.nodes.map((node, index) => {
                const prog = record.curriculumProgress?.[curriculum.id];
                const previous = curriculum.nodes[index - 1];
                const unlocked =
                  index === 0 ||
                  !!prog?.nodeMastery[previous.id]?.mastered ||
                  !!prog?.completedNodeIds?.includes(previous.id);
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      disabled={!unlocked}
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-start min-h-[48px] disabled:opacity-50"
                      onClick={() => navigate(`/play/c/${curriculum.id}/${node.id}`)}
                    >
                      {node.title || tx(node.titleKey || 'paths:currPlanet')}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default PathBoardPage;
