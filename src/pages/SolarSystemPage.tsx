import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Lock, Rocket } from 'lucide-react';

interface Planet {
  id: string;
  name: string;
  topic: string;
  color: string;
  orbitRadius: number;
  route: string;
  prerequisite?: string;
}

const planets: Planet[] = [
  // Counting - Inner planets
  { id: 'sun', name: 'Sun', topic: 'Counting', color: '#FDB813', orbitRadius: 0, route: '/lesson/counting/sun' },
  { id: 'mercury', name: 'Mercury', topic: 'Counting', color: '#8C7853', orbitRadius: 80, route: '/lesson/counting/mercury', prerequisite: 'sun' },
  { id: 'venus', name: 'Venus', topic: 'Counting', color: '#FFC649', orbitRadius: 140, route: '/lesson/counting/venus', prerequisite: 'mercury' },
  
  // Addition - Middle planets
  { id: 'earth', name: 'Earth', topic: 'Addition', color: '#4A90E2', orbitRadius: 200, route: '/lesson/addition/earth', prerequisite: 'venus' },
  { id: 'mars', name: 'Mars', topic: 'Addition', color: '#E27B58', orbitRadius: 260, route: '/lesson/addition/mars', prerequisite: 'earth' },
  { id: 'jupiter', name: 'Jupiter', topic: 'Addition', color: '#C88B3A', orbitRadius: 340, route: '/lesson/addition/jupiter', prerequisite: 'mars' },
  
  // Subtraction - Outer planets
  { id: 'saturn', name: 'Saturn', topic: 'Subtraction', color: '#FAD5A5', orbitRadius: 420, route: '/lesson/subtraction/saturn', prerequisite: 'jupiter' },
  { id: 'uranus', name: 'Uranus', topic: 'Subtraction', color: '#4FD0E7', orbitRadius: 500, route: '/lesson/subtraction/uranus', prerequisite: 'saturn' },
  { id: 'neptune', name: 'Neptune', topic: 'Subtraction', color: '#4166F5', orbitRadius: 580, route: '/lesson/subtraction/neptune', prerequisite: 'uranus' },
];

const SolarSystemPage: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition, completedPlanets, completePlanet } = useGame();

  // Calculate farthest completed planet for rocket position
  const maxOrbitRadius = useMemo(() => {
    let max = 0;
    const orderedPlanets = planets.map(p => p.id);
    for (const planetId of orderedPlanets) {
      if (completedPlanets[planetId as keyof typeof completedPlanets]) {
        const planet = planets.find(p => p.id === planetId);
        if (planet && planet.orbitRadius > max) {
          max = planet.orbitRadius;
        }
      }
    }
    return max;
  }, [completedPlanets]);

  const isPlanetUnlocked = (planet: Planet): boolean => {
    if (!planet.prerequisite) return true;
    return completedPlanets[planet.prerequisite as keyof typeof completedPlanets];
  };

  const handlePlanetClick = (planet: Planet) => {
    if (!isPlanetUnlocked(planet)) return;
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate(planet.route);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col items-center justify-center p-8 overflow-hidden">
      <h1 className="text-3xl font-semibold text-foreground mb-2 animate-fade-in z-20">
        Solar System Journey
      </h1>
      <p className="text-muted-foreground mb-8 animate-fade-in z-20">
        Complete each planet to unlock the next
      </p>

      {/* Solar System Container */}
      <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center">
        {/* Orbital paths */}
        {planets.slice(1).map((planet) => (
          <div
            key={`orbit-${planet.id}`}
            className="absolute rounded-full border border-muted-foreground/20"
            style={{
              width: `${planet.orbitRadius * 2}px`,
              height: `${planet.orbitRadius * 2}px`,
            }}
          />
        ))}

        {/* Rocket indicator */}
        {maxOrbitRadius > 0 && (
          <div
            className="absolute transition-all duration-500"
            style={{
              width: `${maxOrbitRadius * 2}px`,
              height: `${maxOrbitRadius * 2}px`,
              opacity: 0.5,
            }}
          >
            <div className="relative w-full h-full">
              <Rocket
                className="absolute text-cyan-400 animate-pulse"
                size={24}
                style={{
                  top: '-12px',
                  right: '-12px',
                }}
              />
            </div>
          </div>
        )}

        {/* Planets */}
        {planets.map((planet, index) => {
          const isUnlocked = isPlanetUnlocked(planet);
          const isCompleted = completedPlanets[planet.id as keyof typeof completedPlanets];
          
          if (planet.id === 'sun') {
            // Sun in center
            return (
              <button
                key={planet.id}
                onClick={() => handlePlanetClick(planet)}
                className="absolute z-10 group cursor-pointer transition-transform hover:scale-110"
              >
                <div
                  className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
                  style={{
                    backgroundColor: planet.color,
                    boxShadow: `0 0 20px ${planet.color}80`,
                  }}
                  title={planet.name}
                />
                <span className="absolute top-full mt-2 text-sm font-medium text-foreground whitespace-nowrap">
                  {planet.name}
                </span>
              </button>
            );
          }

          // Calculate position on orbit
          const anglePerPlanet = (360 / planets.filter(p => p.id !== 'sun').length);
          const angle = (anglePerPlanet * (index - 1)) * (Math.PI / 180);
          const x = Math.cos(angle) * planet.orbitRadius;
          const y = Math.sin(angle) * planet.orbitRadius;

          return (
            <button
              key={planet.id}
              onClick={() => handlePlanetClick(planet)}
              className={`absolute z-10 group transition-all ${isUnlocked ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}`}
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
              disabled={!isUnlocked}
            >
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all ${
                    isCompleted ? 'ring-2 ring-green-400' : ''
                  }`}
                  style={{
                    backgroundColor: isUnlocked ? planet.color : '#666',
                    opacity: isUnlocked ? 1 : 0.5,
                    boxShadow: isUnlocked ? `0 0 15px ${planet.color}80` : 'none',
                  }}
                  title={planet.name}
                >
                  {!isUnlocked && <Lock size={16} className="text-muted-foreground" />}
                  {isCompleted && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className="absolute top-full mt-2 text-xs font-medium text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {planet.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="mt-10 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
      >
        Back to Home
      </button>
    </div>
  );
};

export default SolarSystemPage;
