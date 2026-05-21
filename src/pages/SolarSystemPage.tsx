import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Rocket } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import NavigationArrows from '@/components/NavigationArrows';
import { subscribeToClass, Classroom } from '@/lib/classroom';
import { getActiveStudent } from '@/lib/session';
import {
  PLANET_ORDER,
  PLANET_META,
  PlanetId,
  canSelectPlanet,
  getLessonRoute,
  getLessonForPlanet,
  SOLAR_ORBIT,
  getTopicDisplayName,
} from '@/lib/planets';

const SolarSystemPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    setShowRocketTransition,
    completedPlanets,
    progressPlanetId,
    classMaxPlanetId,
    setPosition,
    getPlanetStep,
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
  const maxPlanetName = PLANET_META[classMax as PlanetId]?.name ?? 'Sun';

  const maxOrbitRadius = useMemo(() => {
    let max = 0;
    for (const id of PLANET_ORDER) {
      if (completedPlanets[id]) {
        const r = SOLAR_ORBIT[id].orbitRadius;
        if (r > max) max = r;
      }
    }
    return max;
  }, [completedPlanets]);

  const handlePlanetClick = (planetId: PlanetId) => {
    const selectable = canSelectPlanet(planetId, {
      classMaxPlanetId: classMax,
      progressPlanetId,
    });
    if (!selectable) return;

    const lesson = getLessonForPlanet(planetId);
    const isCompleted = completedPlanets[planetId];
    const savedStep = isCompleted ? 0 : getPlanetStep(planetId);
    setPosition(planetId, lesson);
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate(getLessonRoute(planetId), {
        state: { initialStep: savedStep, replay: isCompleted },
      });
    }, 1200);
  };

  const orbitPlanets = PLANET_ORDER.filter((id) => id !== 'sun');

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col items-center justify-center p-8 overflow-hidden">
      <h1 className="text-3xl font-semibold text-foreground mb-2 animate-fade-in z-20 text-center">
        Choose Your Destination
      </h1>
      <p className="text-muted-foreground mb-8 animate-fade-in z-20 text-center max-w-lg">
        Your teacher has unlocked planets through <strong className="text-foreground">{maxPlanetName}</strong>.
        Tap a planet to start or continue its lesson.
      </p>

      <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center mb-8">
        {orbitPlanets.map((id) => (
          <div
            key={`orbit-${id}`}
            className="absolute rounded-full border border-muted-foreground/20"
            style={{
              width: `${SOLAR_ORBIT[id].orbitRadius * 2}px`,
              height: `${SOLAR_ORBIT[id].orbitRadius * 2}px`,
            }}
          />
        ))}

        {maxOrbitRadius > 0 && (
          <div
            className="absolute transition-all duration-500 pointer-events-none"
            style={{
              width: `${maxOrbitRadius * 2}px`,
              height: `${maxOrbitRadius * 2}px`,
              opacity: 0.5,
            }}
          >
            <Rocket
              className="absolute text-cyan-400 animate-pulse"
              size={24}
              style={{ top: '-12px', right: '-12px' }}
            />
          </div>
        )}

        {PLANET_ORDER.map((planetId, index) => {
          const meta = PLANET_META[planetId];
          const selectable = canSelectPlanet(planetId, {
            classMaxPlanetId: classMax,
            progressPlanetId,
          });
          const isCompleted = completedPlanets[planetId];
          const topic = getTopicDisplayName(planetId);

          if (planetId === 'sun') {
            return (
              <button
                key={planetId}
                type="button"
                disabled={!selectable}
                onClick={() => handlePlanetClick(planetId)}
                className={`absolute z-10 flex flex-col items-center transition-transform ${
                  selectable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-40'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-full shadow-lg"
                  style={{
                    backgroundColor: meta.color,
                    boxShadow: selectable ? `0 0 20px ${meta.color}80` : 'none',
                  }}
                />
                <span className="mt-2 text-sm font-semibold text-foreground whitespace-nowrap">
                  {meta.name}
                </span>
                <span className="text-xs text-muted-foreground">{topic}</span>
              </button>
            );
          }

          const anglePerPlanet = 360 / orbitPlanets.length;
          const angle = (anglePerPlanet * (index - 1)) * (Math.PI / 180);
          const r = SOLAR_ORBIT[planetId].orbitRadius;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;

          return (
            <button
              key={planetId}
              type="button"
              disabled={!selectable}
              onClick={() => handlePlanetClick(planetId)}
              className={`absolute z-10 flex flex-col items-center transition-all ${
                selectable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-40'
              }`}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              <div
                className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center ${
                  isCompleted ? 'ring-2 ring-green-400' : ''
                }`}
                style={{
                  backgroundColor: selectable ? meta.color : '#666',
                  boxShadow: selectable ? `0 0 15px ${meta.color}80` : 'none',
                }}
              >
                {!selectable && <Lock size={14} className="text-muted-foreground" />}
                {isCompleted && selectable && (
                  <span className="text-white text-xs font-bold">✓</span>
                )}
              </div>
              <span className="mt-2 text-xs font-semibold text-foreground whitespace-nowrap">
                {meta.name}
              </span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{topic}</span>
            </button>
          );
        })}
      </div>

      <NavigationArrows
        onBack={() => navigate('/')}
        showNext={false}
        backLabel="Sign Out"
      />
    </div>
  );
};

export default SolarSystemPage;
