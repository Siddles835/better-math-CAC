import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import CircleDiagram from '@/components/CircleDiagram';
import NavigationArrows from '@/components/NavigationArrows';

const planets = [
  { id: 'mercury', name: 'Mercury', color: '#c7b89a', route: '/lesson/counting/mercury' },
  { id: 'venus', name: 'Venus', color: '#f3d1b3', route: '/lesson/counting/venus' },
  { id: 'earth', name: 'Earth', color: '#8ecae6', route: '/lesson/counting/earth' },
  { id: 'mars', name: 'Mars', color: '#f28b6b', route: '/lesson/counting/mars' },
  { id: 'jupiter', name: 'Jupiter', color: '#d9c5a6', route: '/lesson/counting/jupiter' },
  { id: 'saturn', name: 'Saturn', color: '#e9d6b2', route: '/lesson/counting/saturn' },
  { id: 'uranus', name: 'Uranus', color: '#bde0fe', route: '/lesson/counting/uranus' },
  { id: 'neptune', name: 'Neptune', color: '#7aa2f7', route: '/lesson/counting/neptune' },
  { id: 'sun', name: 'Sun', color: '#ffd166', route: '/lesson/counting/sun' },
];

const PlanetSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition } = useGame();
  const [selected, setSelected] = useState<string | null>(null);

  const handlePlanetClick = (route: string) => {
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate(route);
    }, 1200);
  };

  const validMap: Record<string, string[]> = {
    counting: ['sun','mercury','venus'],
    addition: ['earth','mars','jupiter'],
    subtraction: ['saturn','uranus','neptune'],
  };

  const startIfValid = (lesson: 'counting'|'addition'|'subtraction', planetId: string) => {
    if (validMap[lesson].includes(planetId)) {
      handlePlanetClick(`/lesson/${lesson}/${planetId}`);
    } else {
      alert('Lesson not available for this planet yet.');
    }
  };

  const handleSelect = (p: any) => {
    setSelected(p.id);
  };

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col items-center justify-start p-8 pt-12">
      <h1 className="text-3xl font-semibold text-foreground mb-2 animate-fade-in">
        Choose Your Destination
      </h1>
      <p className="text-muted-foreground mb-6 animate-fade-in">
        Click a planet to begin. Use the diagram to explore.
      </p>

      <div className="w-full max-w-2xl mx-auto mb-8">
        <CircleDiagram planets={planets} size={420} onSelect={handleSelect} selectedId={selected || undefined} />
      </div>

      <div className="mb-8">
        {selected ? (
          <div className="flex gap-4">
            <button className="btn" onClick={() => setSelected(null)}>Clear</button>
            <button className="btn btn-primary" onClick={() => startIfValid('counting', selected)}>Start Counting</button>
            <button className="btn btn-secondary" onClick={() => startIfValid('addition', selected)}>Start Addition</button>
            <button className="btn btn-warning" onClick={() => startIfValid('subtraction', selected)}>Start Subtraction</button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Select a planet from the circle above.</div>
        )}
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
