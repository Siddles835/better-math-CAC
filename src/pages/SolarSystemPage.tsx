import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogOut, Rocket } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import NavigationArrows from '@/components/NavigationArrows';
import { subscribeToClass, Classroom } from '@/lib/classroom';
import { clearActiveStudent, getActiveStudent, getStudentDisplayName } from '@/lib/session';
import {
  PLANET_ORDER,
  PLANET_META,
  PlanetId,
  canSelectPlanet,
  getLessonRoute,
  getLessonForPlanet,
  SOLAR_ORBIT,
  getTopicDisplayName,
  getClassroomUnlockPlanet,
  getInProgressPlanet,
} from '@/lib/planets';

const BASE_SIZE = 640; // design space that fits Neptune orbit (580) + labels

const SolarSystemPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    setShowRocketTransition,
    completedPlanets,
    progressPlanetId,
    classMaxPlanetId,
    setPosition,
    getPlanetStep,
    planetSteps,
    lastPlanetId,
    markPlanetVisited,
    hydrateFromStudent,
    hydrateClassMax,
  } = useGame();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [selecting, setSelecting] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const active = getActiveStudent();
    if (!active) {
      navigate('/', { replace: true });
      return;
    }
    setDisplayName(getStudentDisplayName(active));
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

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      setScale(Math.min(1, width / BASE_SIZE));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleBack = () => {
    navigate('/');
  };

  const handleSignOut = () => {
    clearActiveStudent();
    navigate('/', { replace: true });
  };

  const classMax =
    getClassroomUnlockPlanet(classroom) ?? classMaxPlanetId ?? 'sun';
  const maxPlanetName = PLANET_META[classMax as PlanetId]?.name ?? 'Sun';
  const continuePlanet = getInProgressPlanet(planetSteps, progressPlanetId, lastPlanetId);

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
    if (selecting) return;
    const selectable = canSelectPlanet(planetId, {
      classMaxPlanetId: classMax,
      progressPlanetId,
    });
    if (!selectable) return;

    const lesson = getLessonForPlanet(planetId);
    const isCompleted = completedPlanets[planetId];
    const savedStep = isCompleted ? 0 : getPlanetStep(planetId);
    setSelecting(true);
    setPosition(planetId, lesson);
    void markPlanetVisited(planetId);
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate(getLessonRoute(planetId), {
        state: { initialStep: savedStep, replay: isCompleted },
      });
      setShowRocketTransition(false);
      setSelecting(false);
    }, 1400);
  };

  const orbitPlanets = PLANET_ORDER.filter((id) => id !== 'sun');

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden pb-28">
      <div className="animate-fade-in z-20 text-center mb-6 sm:mb-8">
        {displayName && (
          <p className="text-sm text-muted-foreground mb-2">
            Playing as <strong className="text-foreground">{displayName}</strong>
            {' · '}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Settings
            </button>
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
          Choose Your Destination
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
          Your teacher has unlocked planets through{' '}
          <strong className="text-foreground">{maxPlanetName}</strong>. Tap a planet to start or
          continue its lesson.
          {continuePlanet && PLANET_META[continuePlanet] && (
            <>
              {' '}
              Tap <strong className="text-foreground">{PLANET_META[continuePlanet].name}</strong> to
              continue where you left off.
            </>
          )}
        </p>
      </div>

      <div ref={stageRef} className="relative w-full max-w-3xl aspect-square flex items-center justify-center mb-8">
        <div
          className="relative"
          style={{
            width: BASE_SIZE,
            height: BASE_SIZE,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
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
                    disabled={!selectable || selecting}
                    onClick={() => handlePlanetClick(planetId)}
                    className={`absolute z-10 flex flex-col items-center transition-transform duration-200 ${
                      selectable ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-not-allowed opacity-40'
                    }`}
                    style={{ minWidth: 56, minHeight: 56 }}
                  >
                    <div
                      className="w-14 h-14 rounded-full shadow-lg"
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
              const angle = anglePerPlanet * (index - 1) * (Math.PI / 180);
              const r = SOLAR_ORBIT[planetId].orbitRadius;
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;

              return (
                <button
                  key={planetId}
                  type="button"
                  disabled={!selectable || selecting}
                  onClick={() => handlePlanetClick(planetId)}
                  className={`absolute z-10 flex flex-col items-center transition-all duration-200 ${
                    selectable ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-not-allowed opacity-40'
                  }`}
                  style={{ transform: `translate(${x}px, ${y}px)`, minWidth: 48, minHeight: 48 }}
                >
                  <div
                    className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center ${
                      isCompleted ? 'ring-2 ring-green-400' : ''
                    }`}
                    style={{
                      backgroundColor: selectable ? meta.color : '#666',
                      boxShadow: selectable ? `0 0 15px ${meta.color}80` : 'none',
                    }}
                  >
                    {!selectable && <Lock size={16} className="text-muted-foreground" />}
                    {isCompleted && selectable && (
                      <span className="text-white text-sm font-bold">✓</span>
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
        </div>
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

export default SolarSystemPage;
