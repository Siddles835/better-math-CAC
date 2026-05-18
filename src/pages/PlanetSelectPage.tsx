import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import CircleDiagram from '@/components/CircleDiagram';
import NavigationArrows from '@/components/NavigationArrows';
import { subscribeToClass, Classroom } from '@/lib/classroom';
import {
  PLANET_ORDER,
  PLANET_META,
  PlanetId,
  canSelectPlanet,
  getLessonForPlanet,
  getLessonRoute,
} from '@/lib/planets';

const PlanetSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    setShowRocketTransition,
    progressPlanetId,
    completedPlanets,
    setPosition,
    hydrateFromStudent,
  } = useGame();
  const [classroom, setClassroom] = useState<Classroom | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('better-math:active');
    if (!raw) {
      navigate('/');
      return;
    }
    const { classCode, nickname } = JSON.parse(raw);
    const unsub = subscribeToClass(classCode, (data) => {
      setClassroom(data);
      if (data?.students?.[nickname]) {
        hydrateFromStudent(data.students[nickname], data.defaultStart?.planet ?? 'sun');
      }
    });
    return () => unsub();
  }, [navigate, hydrateFromStudent]);

  const classMax = classroom?.defaultStart?.planet ?? 'sun';
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
          completedPlanets: completedList,
        });
        return {
          id,
          name: PLANET_META[id].name,
          color: PLANET_META[id].color,
          route: getLessonRoute(id),
          disabled: !selectable,
        };
      }),
    [classMax, progressPlanetId, completedList]
  );

  const handlePlanetSelect = async (planetId: string) => {
    const lesson = getLessonForPlanet(planetId);
    await setPosition(planetId as PlanetId, lesson);
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate(getLessonRoute(planetId));
    }, 1200);
  };

  const maxPlanetName = PLANET_META[classMax as PlanetId]?.name ?? 'Sun';

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-semibold text-foreground mb-2 text-center">
        Choose Your Destination
      </h1>
      <p className="text-muted-foreground mb-8 text-center max-w-lg">
        Your teacher has unlocked planets through{' '}
        <strong className="text-foreground">{maxPlanetName}</strong>. Tap a planet to start its
        lesson.
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
          ? 'Pick any unlocked planet to begin. After you progress, use Home to replay earlier planets.'
          : 'Select a planet you have already passed to practice again.'}
      </p>

      <NavigationArrows onBack={() => navigate('/')} showNext={false} backLabel="Back" />
    </div>
  );
};

export default PlanetSelectPage;
