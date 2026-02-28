// Addition Lesson - Earth (Activity/Practice with pencils)
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

const AdditionEarth: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition } = useGame();
  const [step, setStep] = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  
  // Animation state
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'initial' | 'animating' | 'final'>('idle');
  const [displayCount, setDisplayCount] = useState(3);
  const [showNewPencils, setShowNewPencils] = useState(false);
  
  // Activity state
  const [leftPencils] = useState(3);
  const [rightPencils, setRightPencils] = useState(0);
  const [availablePencils, setAvailablePencils] = useState(5);
  
  // Target activity state
  const [activity2Left] = useState(2);
  const [activity2Right, setActivity2Right] = useState(0);
  const [activity2Available, setActivity2Available] = useState(6);
  const [activity2Target] = useState(6);
  const [activity2Checked, setActivity2Checked] = useState(false);

  const totalSteps = 4;

  const startAnimation = () => {
    setAnimationPhase('initial');
    setDisplayCount(3);
    setShowNewPencils(false);
    
    setTimeout(() => {
      setAnimationPhase('animating');
      setShowNewPencils(true);
    }, 1000);
    
    setTimeout(() => {
      setDisplayCount(5);
    }, 2000);
    
    setTimeout(() => {
      setAnimationPhase('final');
    }, 3000);
  };

  const addPencilRight = () => {
    if (availablePencils > 0 && leftPencils + rightPencils < 9) {
      setRightPencils(prev => prev + 1);
      setAvailablePencils(prev => prev - 1);
    }
  };

  const addPencilActivity2 = () => {
    if (activity2Available > 0 && !activity2Checked && activity2Left + activity2Right < 9) {
      setActivity2Right(prev => prev + 1);
      setActivity2Available(prev => prev - 1);
    }
  };

  const checkActivity2 = () => {
    setActivity2Checked(true);
  };

  const resetActivity2 = () => {
    setActivity2Right(0);
    setActivity2Available(6);
    setActivity2Checked(false);
  };

  const goToNextPlanet = () => {
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate('/lesson/addition/mars');
    }, 2500);
  };

  if (showTransition) {
    return (
      <PlanetTransition
        currentPlanet="Earth"
        nextPlanet="Mars"
        currentPlanetColor="bg-earth"
        nextPlanetColor="bg-mars"
        topic="Addition"
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
              Watch: Adding Pencils
            </h2>
            
            <div className="bg-card rounded-xl p-10 border border-border mb-8 min-w-[400px]">
              <div className="flex justify-center items-end gap-3 mb-6 min-h-[120px]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i}>
                    <Pencil className="pointer-events-none" size="lg" />
                  </div>
                ))}
                {showNewPencils && (
                  <>
                    <div className="animate-pencil-appear">
                      <Pencil className="pointer-events-none" size="lg" />
                    </div>
                    <div className="animate-pencil-appear" style={{ animationDelay: '0.3s' }}>
                      <Pencil className="pointer-events-none" size="lg" />
                    </div>
                  </>
                )}
              </div>
              <Counter count={displayCount} />
              
              {animationPhase === 'final' && (
                <p className="mt-6 text-muted-foreground text-lg animate-fade-in">
                  3 + 2 = 5 pencils!
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
              Add Pencils
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              Click pencils to add them
            </p>
            
            <div className="bg-card rounded-xl p-10 border border-border mb-8">
              <div className="flex items-center justify-center gap-12">
                <div className="flex gap-2">
                  {Array.from({ length: leftPencils }).map((_, i) => (
                    <Pencil key={i} className="pointer-events-none" />
                  ))}
                </div>
                
                <span className="text-5xl font-bold text-earth">+</span>
                
                <div className="flex gap-2 min-w-[120px] justify-center">
                  {Array.from({ length: rightPencils }).map((_, i) => (
                    <div key={i} className="animate-pencil-appear">
                      <Pencil className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8">
                <Counter count={leftPencils + rightPencils} label="Total" />
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto">
              {Array.from({ length: availablePencils }).map((_, i) => (
                <Pencil key={i} onClick={addPencilRight} />
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Make {activity2Target} Pencils
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Add until you have {activity2Target}
            </p>
            
            <div className="flex justify-center gap-8 mb-8">
              <Counter count={activity2Left + activity2Right} label="You have" />
              <Counter count={activity2Target} label="You need" />
            </div>
            
            <div className="bg-card rounded-xl p-10 border border-border mb-8">
              <div className="flex items-center justify-center gap-12">
                <div className="flex gap-2">
                  {Array.from({ length: activity2Left }).map((_, i) => (
                    <Pencil key={i} className="pointer-events-none" />
                  ))}
                </div>
                
                <span className="text-5xl font-bold text-earth">+</span>
                
                <div className="flex gap-2 min-w-[120px] justify-center">
                  {Array.from({ length: activity2Right }).map((_, i) => (
                    <div key={i} className="animate-pencil-appear">
                      <Pencil className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {!activity2Checked && (
              <>
                <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto mb-8">
                  {Array.from({ length: activity2Available }).map((_, i) => (
                    <Pencil key={i} onClick={addPencilActivity2} />
                  ))}
                </div>
                <Button onClick={checkActivity2} size="lg">Check</Button>
              </>
            )}
            
            {activity2Checked && (
              <div className="flex flex-col items-center gap-4">
                <div className={`flex items-center gap-2 ${
                  activity2Left + activity2Right === activity2Target ? 'text-success' : 'text-destructive'
                }`}>
                  {activity2Left + activity2Right === activity2Target ? (
                    <>
                      <Check className="w-8 h-8" />
                      <span className="text-xl font-semibold">Great!</span>
                    </>
                  ) : (
                    <>
                      <X className="w-8 h-8" />
                      <span className="text-xl font-semibold">
                        You need {activity2Target - activity2Left} more
                      </span>
                    </>
                  )}
                </div>
                {activity2Left + activity2Right !== activity2Target && (
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
              Great Work on Earth!
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              You learned how to add. Watch this video:
            </p>
            
            <div className="bg-card rounded-xl p-10 border border-border max-w-xl mx-auto mb-10">
              <div className="aspect-video bg-muted rounded-lg">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/UT82HObKKtU"
                  title="Addition Song"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                />
              </div>
            </div>
            
            <Button onClick={() => setShowTransition(true)} size="lg">
              Go to Mars
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
              i === step ? 'bg-earth' : i < step ? 'bg-earth/50' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto">
        {renderStep()}
      </div>

      {step < 3 && (
        <NavigationArrows
          onBack={step > 0 ? () => setStep(step - 1) : () => navigate('/planets')}
          onNext={() => setStep(step + 1)}
          showNext={true}
          backLabel="Back"
          nextLabel="Next"
        />
      )}
    </div>
  );
};

export default AdditionEarth;
