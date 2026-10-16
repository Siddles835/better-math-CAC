import { tx } from '@/i18n/tx';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPathOrFoundations } from '@/content/catalog';
import type { Curriculum, LearnerRecord, PathNode } from '@/content/types';
import { getPort } from '@/lib/data/port';
import { resolveAssignment } from '@/lib/curriculum/logic';
import { isNodeUnlocked, progressFor } from '@/lib/paths/progress';
import { loadActiveLearner, normalizePathId } from '@/lib/paths/activeLearner';
import { getLessonRoute } from '@/lib/planets';
import type { PlanetId } from '@/lib/planets';
import { Button } from '@/components/ui/button';
import { withTimeoutFallback } from '@/lib/asyncTimeout';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';
import { getActiveStudent } from '@/lib/session';
import { formatPathText } from '@/lib/paths/text';

const nodeAboutKey = (pathId: string, node: PathNode): string =>
  `paths:${pathId}_node_${node.order}_about`;

const PathBoardPage = () => {
  const navigate = useNavigate();
  const [record, setRecord] = useState<LearnerRecord | null>(null);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [mode, setMode] = useState<'replace' | 'alongside' | null>(null);
  const [solo, setSolo] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        if (!getActiveStudent()) {
          if (!cancel) {
            setReady(true);
            navigate('/student-login', { replace: true });
          }
          return;
        }
        const loaded = await loadActiveLearner();
        if (cancel) return;
        if (!loaded) {
          navigate(STUDENT_HUB_PATH, { replace: true });
          return;
        }
        setRecord({
          ...loaded.record,
          activePathId: normalizePathId(loaded.record.activePathId),
        });
        setSolo(loaded.solo);
        if (!loaded.solo) {
          const port = getPort(loaded.classCode, false);
          const assignments = await withTimeoutFallback(
            port.listAssignments(loaded.classCode),
            4000,
            [],
            'listAssignments'
          );
          const chosen = resolveAssignment(assignments, loaded.studentKey, false);
          if (chosen) {
            const curricula = await withTimeoutFallback(
              port.listCurricula(loaded.classCode),
              4000,
              [],
              'listCurricula'
            );
            const found = curricula.find((item) => item.id === chosen.curriculumId) ?? null;
            if (!cancel) {
              setCurriculum(found);
              setMode(found ? chosen.mode : null);
            }
          }
        }
      } catch (error) {
        console.error('Path board failed to load', error);
        if (!cancel) navigate(STUDENT_HUB_PATH, { replace: true });
      } finally {
        if (!cancel) setReady(true);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [navigate]);

  if (!ready || !record) {
    return (
      <div className="min-h-screen bg-background p-8 text-muted-foreground" data-testid="path-board-loading">
        {tx('ui:s_a981d720b9')}
      </div>
    );
  }

  const path = getPathOrFoundations(record.activePathId);
  const progress = progressFor(record, path.id);
  const showPath = mode !== 'replace';
  const showCurriculum = !!curriculum && !solo;

  return (
    <div
      className="min-h-screen bg-background subtle-stars p-6"
      style={{ ['--path-accent' as string]: path.theme.accent }}
      data-testid="path-board"
    >
      <div className="mx-auto max-w-xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">{tx(path.titleKey)}</h1>
          {solo && (
            <Button
              type="button"
              variant="outline"
              className="min-h-[48px]"
              onClick={() => navigate('/pick-path?mode=switch&next=hub')}
            >
              {tx('paths:openPaths')}
            </Button>
          )}
        </div>
        <p className="mb-6 text-muted-foreground">{tx(path.summaryKey)}</p>

        {showPath && (
          <ul className="space-y-3">
            {path.nodes.map((node, index) => {
              const unlocked = isNodeUnlocked(path, progress, node.id);
              const mastered =
                !!progress.nodeMastery[node.id]?.mastered ||
                progress.completedNodeIds.includes(node.id);
              const title = node.title ? node.title : tx(node.titleKey);
              const about = formatPathText(
                nodeAboutKey(path.id, node),
                undefined,
                node.topics.map((topic) => topic.replace(/-/g, ' ')).join(', ')
              );
              const status = mastered
                ? tx('paths:playMastered')
                : unlocked
                  ? tx('paths:levelReady')
                  : tx('paths:playLocked');
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    disabled={!unlocked}
                    data-testid={`path-node-${node.id}`}
                    className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-start min-h-[48px] disabled:opacity-50"
                    onClick={() => {
                      if (node.source.kind === 'legacy') {
                        navigate(getLessonRoute(node.source.planetId as PlanetId));
                      } else {
                        navigate(`/play/${path.id}/${node.id}`);
                      }
                    }}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {tx('paths:levelLabel', { n: index + 1 })}
                        </span>
                        <span className="mt-1 block text-lg font-semibold">{title}</span>
                      </span>
                      <span className="shrink-0 text-sm text-muted-foreground">{status}</span>
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                      {about}
                    </span>
                    {path.id === 'geometry' && (
                      <span className="mt-2 block text-sm text-foreground/80">
                        {formatPathText(`paths:geometry_node_${node.order}_real`)}
                      </span>
                    )}
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
