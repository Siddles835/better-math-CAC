import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import CircleDiagram from '@/components/CircleDiagram';
import NavigationArrows from '@/components/NavigationArrows';
import { subscribeToClass, Classroom } from '@/lib/classroom';
import { getActiveStudent } from '@/lib/session';
import {
  PLANET_ORDER,
  PLANET_META,
  PlanetId,
  canSelectPlanet,
  getLessonForPlanet,
  getLessonRoute,
  getInProgressPlanet,
} from '@/lib/planets';

const PlanetSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    setShowRocketTransition,
    progressPlanetId,
    completedPlanets,
    classMaxPlanetId,
    setPosition,
    getPlanetStep,
    planetSteps,
    hydrateFromStudent,
    hydrateClassMax,
  } = useGame();
  const [classroom, setClassroom] = useState<Classroom | null>(null);

  useEffect(() => {
    const active = getActiveStudent();
    if (!active) {
      navigate('/');
      return;
    }
    const { classCode, nickname } = active;
    const unsub = subscribeToClass(classCode, (data) => {
      setClassroom(data);
      if (!data) return;
      hydrateClassMax(data.defaultStart?.planet);
      if (data.students?.[nickname]) {
        hydrateFromStudent(data.students[nickname]);
      }
    });
    return () => unsub();
  }, [navigate, hydrateFromStudent, hydrateClassMax]);

  const classMax = classroom?.defaultStart?.planet ?? classMaxPlanetId ?? 'sun';
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
        };
      }),
    [classMax, progressPlanetId]
  );

  const handlePlanetSelect = (planetId: string) => {
    const pid = planetId as PlanetId;
    const lesson = getLessonForPlanet(planetId);
    const savedStep = getPlanetStep(pid);
    setPosition(pid, lesson);
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate(getLessonRoute(planetId), { state: { initialStep: savedStep } });
    }, 1200);
  };

  const maxPlanetName = PLANET_META[classMax as PlanetId]?.name ?? 'Sun';
  const continuePlanet = getInProgressPlanet(planetSteps);

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-semibold text-foreground mb-2 text-center">
        Choose Your Destination
      </h1>
      <p className="text-muted-foreground mb-8 text-center max-w-lg">
        Your teacher has unlocked planets through{' '}
        <strong className="text-foreground">{maxPlanetName}</strong>. Tap a planet to start its
        lesson.
        {continuePlanet && PLANET_META[continuePlanet] && (
          <>
            {' '}
            Tap <strong className="text-foreground">{PLANET_META[continuePlanet].name}</strong> to
            continue where you left off.
          </>
        )}
      </p>

      <div className="flex w-full justify-center items-center mb-10">
        <CircleDiagram
          planets={diagramPlanets}
          size={440}
          onSelect={(p) => !p.disabled && handlePlanetSelect(p.id)}
        />
      </div>

      <p className="text-sm text-muted-foreground mb-20 text-center max-w-md">
        {completedList.length === 0
          ? 'Pick any unlocked planet to begin. Your teacher can open more planets anytime.'
          : 'Replay earlier planets or jump ahead to any planet your teacher has unlocked.'}
      </p>

      <NavigationArrows onBack={() => navigate('/')} showNext={false} backLabel="Back" />
    </div>
  );
};

export default PlanetSelectPage;
