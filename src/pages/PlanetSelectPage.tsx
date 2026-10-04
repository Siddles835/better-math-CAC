import { tx } from '@/i18n/tx';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGame } from '@/context/GameContext';
import CircleDiagram from '@/components/CircleDiagram';
import NavigationArrows from '@/components/NavigationArrows';
import NextFocusCard from '@/components/NextFocusCard';
import { STARTER_HINT } from '@/lib/cognition';
import { subscribeToClass, Classroom } from '@/lib/classroom';
import { clearActiveStudent, getActiveStudent, getStudentDisplayName } from '@/lib/session';
import {
  PLANET_ORDER,
  PLANET_META,
  PlanetId,
  canSelectPlanet,
  getLessonForPlanet,
  getLessonRoute,
  getInProgressPlanet,
  getClassroomUnlockPlanet,
} from '@/lib/planets';
import { isSoloClassCode, loadSoloProgress, soloProgressToStudent } from '@/lib/solo';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const PlanetSelectPage: React.FC = () => {
  const { t } = useTranslation('explore');
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    setShowRocketTransition,
    progressPlanetId,
    completedPlanets,
    classMaxPlanetId,
    setPosition,
    getPlanetStep,
    planetSteps,
    lastPlanetId,
    lastDiagnosis,
    markPlanetVisited,
    hydrateFromStudent,
    hydrateClassMax,
  } = useGame();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    const active = getActiveStudent();
    if (!active) {
      navigate('/', { replace: true });
      return;
    }
    setDisplayName(getStudentDisplayName(active));
    if (isSoloClassCode(active.classCode) || active.solo) {
      const progress = loadSoloProgress(active.nickname);
      if (progress) {
        hydrateClassMax(progress.unlockPlanet);
        hydrateFromStudent(soloProgressToStudent(progress));
      }
      return;
    }
    const { classCode, nickname } = active;
    const unsub = subscribeToClass(classCode, (data) => {
      setClassroom(data);
      if (!data) return;
      const unlock = getClassroomUnlockPlanet(data);
      if (unlock) hydrateClassMax(unlock);
      if (data.students?.[nickname]) {
        hydrateFromStudent(data.students[nickname]);
      }
    });
    return () => unsub();
  }, [navigate, hydrateFromStudent, hydrateClassMax]);

  const handleBack = () => {
    navigate('/');
  };

  const handleSignOut = () => {
    clearActiveStudent();
    navigate('/', { replace: true });
  };

  const classMax =
    getClassroomUnlockPlanet(classroom) ?? classMaxPlanetId ?? 'sun';
  const completedList = useMemo(
    () => PLANET_ORDER.filter((id) => completedPlanets[id]),
    [completedPlanets]
  );

  const diagramPlanets = useMemo(
    () =>
      PLANET_ORDER.map((id) => {
        const selectable = canSelectPlanet(id, {
          classMaxPlanetId: classMax,
          progressPlanetId,
        });
        return {
          id,
          name: PLANET_META[id].name,
          color: PLANET_META[id].color,
          route: getLessonRoute(id),
          disabled: !selectable,
          glow: Boolean(lastDiagnosis?.glowPlanets.includes(id)),
        };
      }),
    [classMax, progressPlanetId, lastDiagnosis]
  );

  const handlePlanetSelect = (planetId: string) => {
    if (selecting) return;
    const pid = planetId as PlanetId;
    const lesson = getLessonForPlanet(planetId);
    const isCompleted = completedPlanets[pid];
    const savedStep = isCompleted ? 0 : getPlanetStep(pid);
    setSelecting(true);
    setPosition(pid, lesson);
    void markPlanetVisited(pid);
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate(getLessonRoute(planetId), {
        state: { initialStep: savedStep, replay: isCompleted },
      });
      setShowRocketTransition(false);
      setSelecting(false);
    }, 1400);
  };

  const maxPlanetLabel = tx(`ui:planet_${classMax as PlanetId}`);
  const continuePlanet = getInProgressPlanet(planetSteps, progressPlanetId, lastPlanetId);
  const solo = isSoloClassCode(getActiveStudent()?.classCode);

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col items-center justify-center p-8">
      <div className="animate-fade-in text-center mb-8">
        {displayName && (
          <p className="text-sm text-muted-foreground mb-2">{tx('ui:s_b82e180967')}<strong className="text-foreground">{displayName}</strong>
            {' · '}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="underline underline-offset-2 hover:text-foreground"
            >{tx('ui:s_c7f73bb54d')}</button>
          </p>
        )}
        <h1 className="text-3xl font-semibold text-foreground mb-2">{tx('ui:s_7bb59b2f67')}</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          {solo
            ? tx('ui:hub_unlock_solo', { planet: maxPlanetLabel })
            : tx('ui:hub_unlock_class', { planet: maxPlanetLabel })}
          {continuePlanet && (
            <>
              {' '}
              {tx('ui:hub_continue_tap', { planet: tx(`ui:planet_${continuePlanet}`) })}
            </>
          )}
        </p>
        {lastDiagnosis ? (
          <NextFocusCard
            diagnosis={lastDiagnosis}
            canOpen={
              lastDiagnosis.primary !== 'STEADY' &&
              canSelectPlanet(lastDiagnosis.nextPlanet, {
                classMaxPlanetId: classMax,
                progressPlanetId,
              })
            }
            onOpen={() => handlePlanetSelect(lastDiagnosis.nextPlanet)}
          />
        ) : (
          <NextFocusCard diagnosis={STARTER_HINT} canOpen={false} onOpen={() => undefined} />
        )}
      </div>

      <div className="flex w-full justify-center items-center mb-10 animate-fade-in">
        <CircleDiagram
          planets={diagramPlanets}
          size={isMobile === false ? 440 : 300}
          onSelect={(p) => !p.disabled && !selecting && handlePlanetSelect(p.id)}
        />
      </div>

      <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
        {solo
          ? completedList.length === 0
            ? tx('ui:hub_pick_solo_new')
            : tx('ui:hub_pick_solo_return')
          : completedList.length === 0
            ? tx('ui:hub_pick_class_new')
            : tx('ui:hub_pick_class_return')}
      </p>

      <div className="mb-20 flex justify-center">
        <Button
          type="button"
          className="min-h-11"
          data-testid="hub-explore"
          onClick={() => navigate('/explore')}
        >
          {t('hub_cta')}
        </Button>
      </div>

      <NavigationArrows
        onBack={handleBack}
        onNext={handleSignOut}
        nextLabel="Sign Out"
        nextIcon={<LogOut className="h-6 w-6 shrink-0 text-foreground" strokeWidth={2.5} aria-hidden />}
      />
    </div>
  );
};

export default PlanetSelectPage;
