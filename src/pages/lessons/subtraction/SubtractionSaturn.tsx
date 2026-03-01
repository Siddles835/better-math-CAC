// Subtraction Lesson - Saturn (Activity/Practice)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import NavigationArrows from '@/components/NavigationArrows';
import Pencil from '@/components/Pencil';
import Counter from '@/components/Counter';
import PlanetTransition from '@/components/PlanetTransition';
import HomeButton from '@/components/HomeButton';
import { Button } from '@/components/ui/button';
import { Check, X, Play, RotateCcw } from 'lucide-react';

const SubtractionSaturn: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition, completePlanet } = useGame();
  const [step, setStep] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  
  // Animation state
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'initial' | 'animating' | 'final'>('idle');
  const [displayCount, setDisplayCount] = useState(5);
  const [hidePencils, setHidePencils] = useState(false);
  
  // Activity state
  const [leftPencils, setLeftPencils] = useState(6);
  const [removedPencils, setRemovedPencils] = useState(0);
  
  // Target activity state
  const [activity2Pencils, setActivity2Pencils] = useState(7);
  const [activity2Removed, setActivity2Removed] = useState(0);
  const [activity2Target] = useState(4);
  const [activity2Checked, setActivity2Checked] = useState(false);

  const totalSteps = 4;

  const startAnimation = () => {
    setAnimationPhase('initial');
    setDisplayCount(5);
    setHidePencils(false);
    
    setTimeout(() => {
      setAnimationPhase('animating');
      setHidePencils(true);
    }, 1000);
    
    setTimeout(() => {
      setDisplayCount(3);
    }, 2000);
    
    setTimeout(() => {
      setAnimationPhase('final');
    }, 3000);
  };

  const removePencil = () => {
    if (leftPencils > 0) {
      setLeftPencils(prev => prev - 1);
      setRemovedPencils(prev => prev + 1);
    }
  };

  const removePencilActivity2 = () => {
    if (activity2Pencils > 0 && !activity2Checked) {
      setActivity2Pencils(prev => prev - 1);
      setActivity2Removed(prev => prev + 1);
    }
  };

  const checkActivity2 = () => {
    setActivity2Checked(true);
  };

  const resetActivity2 = () => {
    setActivity2Pencils(7);
    setActivity2Removed(0);
    setActivity2Checked(false);
  };

  const goToNextPlanet = () => {
    completePlanet('saturn');
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate('/lesson/subtraction/uranus');
    }, 2500);
  };

  if (showTransition) {
    return (
      <PlanetTransition
        currentPlanet="Saturn"
        nextPlanet="Uranus"
        currentPlanetColor="bg-saturn"
        nextPlanetColor="bg-uranus"
        topic="Subtraction"
        onContinue={goToNextPlanet}
      />
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-8">
              Watch: Taking Away
            </h2>
            
            <div className="bg-card rounded-xl p-10 border border-border mb-8 min-w-[400px]">
              <div className="flex justify-center items-end gap-3 mb-6 min-h-[120px]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i}>
                    <Pencil className="pointer-events-none" size="lg" />
                  </div>
                ))}
                {!hidePencils && animationPhase !== 'final' && (
                  <>
                    <div className={hidePencils ? 'animate-pencil-disappear' : ''}>
                      <Pencil className="pointer-events-none" size="lg" />
                    </div>
                    <div className={hidePencils ? 'animate-pencil-disappear' : ''}>
                      <Pencil className="pointer-events-none" size="lg" />
                    </div>
                  </>
                )}
                {animationPhase === 'animating' && (
                  <div className="flex gap-3 animate-pencil-disappear">
                    <Pencil className="pointer-events-none opacity-50" size="lg" />
                    <Pencil className="pointer-events-none opacity-50" size="lg" />
                  </div>
                )}
              </div>
              <Counter count={displayCount} />
              
              {animationPhase === 'final' && (
                <p className="mt-6 text-muted-foreground text-lg animate-fade-in">
                  5 - 2 = 3 left!
                </p>
              )}
            </div>
            
            <div className="flex justify-center gap-4">
              {animationPhase === 'idle' && (
                <Button onClick={startAnimation} size="lg">
                  <Play className="w-5 h-5 mr-2" />
                  Watch
                </Button>
              )}
              {animationPhase === 'final' && (
                <Button onClick={startAnimation} variant="outline" size="lg">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Watch Again
                </Button>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-6">
              Take Away Pencils
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              Click pencils to take them away
            </p>
            
            <div className="bg-card rounded-xl p-10 border border-border mb-8">
              <div className="flex items-center justify-center gap-12">
                <div className="flex gap-2 min-w-[180px] justify-center flex-wrap">
                  {Array.from({ length: leftPencils }).map((_, i) => (
                    <Pencil key={i} onClick={removePencil} />
                  ))}
                </div>
                
                <span className="text-5xl font-bold text-saturn">−</span>
                
                <div className="flex gap-2 min-w-[100px] justify-center opacity-40">
                  {Array.from({ length: removedPencils }).map((_, i) => (
                    <div key={i} className="animate-pencil-appear">
                      <Pencil className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8">
                <Counter count={leftPencils} label="Left" />
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground">
              Started: 6, Took: {removedPencils}, Left: {leftPencils}
            </p>
          </div>
        );

      case 2:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Leave {activity2Target} Pencils
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Take away until you have {activity2Target}
            </p>
            
            <div className="flex justify-center gap-8 mb-8">
              <Counter count={activity2Pencils} label="You have" />
              <Counter count={activity2Target} label="You need" />
            </div>
            
            <div className="bg-card rounded-xl p-10 border border-border mb-8">
              <div className="flex items-center justify-center gap-12">
                <div className="flex gap-2 min-w-[180px] justify-center flex-wrap">
                  {Array.from({ length: activity2Pencils }).map((_, i) => (
                    <Pencil 
                      key={i} 
                      onClick={!activity2Checked ? removePencilActivity2 : undefined} 
                      className={activity2Checked ? 'pointer-events-none' : ''}
                    />
                  ))}
                </div>
                
                <span className="text-5xl font-bold text-saturn">−</span>
                
                <div className="flex gap-2 min-w-[100px] justify-center opacity-40">
                  {Array.from({ length: activity2Removed }).map((_, i) => (
                    <div key={i} className="animate-pencil-appear">
                      <Pencil className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {!activity2Checked && (
              <Button onClick={checkActivity2} size="lg">Check</Button>
            )}
            
            {activity2Checked && (
              <div className="flex flex-col items-center gap-4">
                <div className={`flex items-center gap-2 ${
                  activity2Pencils === activity2Target ? 'text-success' : 'text-destructive'
                }`}>
                  {activity2Pencils === activity2Target ? (
                    <>
                      <Check className="w-8 h-8" />
                      <span className="text-xl font-semibold">Great!</span>
                    </>
                  ) : (
                    <>
                      <X className="w-8 h-8" />
                      <span className="text-xl font-semibold">
                        You need {activity2Target} left
                      </span>
                    </>
                  )}
                </div>
                {activity2Pencils !== activity2Target && (
                  <Button onClick={resetActivity2} variant="outline" size="lg">
                    Try Again
                  </Button>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Great Work on Saturn!
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              You learned how to subtract. Watch this video:
            </p>
            
            <div className="bg-card rounded-xl p-10 border border-border max-w-xl mx-auto mb-10">
              <div className="aspect-video bg-muted rounded-lg">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/uelHwf8o7_U"
                  title="Subtraction Song"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                />
              </div>
            </div>
            
            <Button onClick={() => setShowTransition(true)} size="lg">
              Go to Uranus
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col p-4 md:p-8">
      <HomeButton />
      
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i === step ? 'bg-saturn' : i < step ? 'bg-saturn/50' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto">
        {renderStep()}
      </div>

      {step < 3 && (
        <NavigationArrows
          onBack={step > 0 ? () => setStep(step - 1) : () => navigate('/solar-system')}
          onNext={() => setStep(step + 1)}
          showNext={true}
          backLabel="Back"
          nextLabel="Next"
        />
      )}
    </div>
  );
};

export default SubtractionSaturn;
