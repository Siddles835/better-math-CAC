import React from 'react';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

interface PlanetTransitionProps {
  currentPlanet: string;
  nextPlanet: string;
  currentPlanetColor: string;
  nextPlanetColor: string;
  topic: string;
  onContinue: () => void;
}

const PlanetTransition: React.FC<PlanetTransitionProps> = ({
  currentPlanet,
  nextPlanet,
  currentPlanetColor,
  nextPlanetColor,
  topic,
  onContinue,
}) => {
  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col items-center justify-center p-8">
      <div className="text-center animate-fade-in max-w-lg">
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Great job on {currentPlanet}!
        </h2>
        
        <p className="text-muted-foreground mb-8">
          Ready for the next part of {topic}?
        </p>
        
        <div className="flex items-center justify-center gap-8 mb-10">
          {/* Current planet */}
          <div className="flex flex-col items-center">
            <div 
              className={`w-16 h-16 rounded-full ${currentPlanetColor} opacity-50`}
            />
            <span className="text-sm text-muted-foreground mt-2">{currentPlanet}</span>
          </div>
          
          {/* Arrow */}
          <div className="flex items-center">
            <Rocket className="w-8 h-8 text-primary animate-gentle-float" />
          </div>
          
          {/* Next planet */}
          <div className="flex flex-col items-center">
            <div 
              className={`w-20 h-20 rounded-full ${nextPlanetColor} animate-gentle-float`}
            />
            <span className="text-sm text-foreground mt-2 font-medium">{nextPlanet}</span>
          </div>
        </div>
        
        <Button onClick={onContinue} size="lg" className="px-8">
          Go to {nextPlanet}
        </Button>
      </div>
    </div>
  );
};

export default PlanetTransition;
