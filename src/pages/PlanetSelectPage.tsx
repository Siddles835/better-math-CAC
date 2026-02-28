import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import NavigationArrows from '@/components/NavigationArrows';

const planetGroups = [
  {
    topic: 'Counting',
    planets: [
      { id: 'counting-sun', name: 'Sun', color: 'bg-sun', route: '/lesson/counting/sun' },
      { id: 'counting-mercury', name: 'Mercury', color: 'bg-mercury', route: '/lesson/counting/mercury' },
      { id: 'counting-venus', name: 'Venus', color: 'bg-venus', route: '/lesson/counting/venus' },
    ],
  },
  {
    topic: 'Addition',
    planets: [
      { id: 'addition-earth', name: 'Earth', color: 'bg-earth', route: '/lesson/addition/earth' },
      { id: 'addition-mars', name: 'Mars', color: 'bg-mars', route: '/lesson/addition/mars' },
      { id: 'addition-jupiter', name: 'Jupiter', color: 'bg-jupiter', route: '/lesson/addition/jupiter' },
    ],
  },
  {
    topic: 'Subtraction',
    planets: [
      { id: 'subtraction-saturn', name: 'Saturn', color: 'bg-saturn', route: '/lesson/subtraction/saturn' },
      { id: 'subtraction-uranus', name: 'Uranus', color: 'bg-uranus', route: '/lesson/subtraction/uranus' },
      { id: 'subtraction-neptune', name: 'Neptune', color: 'bg-neptune', route: '/lesson/subtraction/neptune' },
    ],
  },
];

const PlanetSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition } = useGame();

  const handlePlanetClick = (route: string) => {
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate(route);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col items-center justify-start p-8 pt-12">
      <h1 className="text-3xl font-semibold text-foreground mb-2 animate-fade-in">
        Choose Your Destination
      </h1>
      <p className="text-muted-foreground mb-10 animate-fade-in">
        Pick a planet to start learning
      </p>

      <div className="flex flex-col gap-10 w-full max-w-4xl">
        {planetGroups.map((group, groupIndex) => (
          <div 
            key={group.topic} 
            className="animate-fade-in"
            style={{ animationDelay: `${groupIndex * 0.15}s` }}
          >
            <h2 className="text-xl font-medium text-foreground mb-4 text-center">
              {group.topic}
            </h2>
            <div className="flex justify-center gap-6 md:gap-10">
              {group.planets.map((planet, planetIndex) => (
                <button
                  key={planet.id}
                  onClick={() => handlePlanetClick(planet.route)}
                  className="group flex flex-col items-center"
                  style={{ animationDelay: `${(groupIndex * 3 + planetIndex) * 0.1}s` }}
                >
                  <div
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-full ${planet.color} 
                      transition-all duration-300 group-hover:scale-110 
                      flex items-center justify-center mb-3`}
                  >
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full ${planet.color} opacity-70`} />
                  </div>
                  <span className="text-base font-medium text-foreground">
                    {planet.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <NavigationArrows
        onBack={() => navigate('/')}
        showNext={false}
        backLabel="Back"
      />
    </div>
  );
};

export default PlanetSelectPage;
