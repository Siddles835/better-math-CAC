// Subtraction Lesson - Saturn (Activity/Practice)
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useLessonStep } from '@/hooks/useLessonStep';
import Pencil from '@/components/Pencil';
import Counter from '@/components/Counter';
import PlanetTransition from '@/components/PlanetTransition';
import LessonShell from '@/components/LessonShell';
import LessonCelebration from '@/components/LessonCelebration';
import ReadAloudButton from '@/components/ReadAloudButton';
import GuidedPractice from '@/components/GuidedPractice';
import { Button } from '@/components/ui/button';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { Check, X, Play, RotateCcw } from 'lucide-react';

const SubtractionSaturn: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition, completePlanet } = useGame();
  const [step, setStep] = useLessonStep('saturn');
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
  const [showGuided, setShowGuided] = useState(false);
  const activity2Start = 7;

  const totalSteps = 4;

  const startAnimation = () => {
    setAnimationPhase('initial');
    setHidePencils(false);
    // Drop to 0 first so the counter actually announces "5" on the first play too.
    setDisplayCount(0);
    window.setTimeout(() => setDisplayCount(5), 50);

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
    if (activity2Pencils !== activity2Target) {
      hapticError();
      setShowGuided(true);
    } else {
      hapticSuccess();
    }
  };

  const resetActivity2 = () => {
    setActivity2Pencils(activity2Start);
    setActivity2Removed(0);
    setActivity2Checked(false);
    setShowGuided(false);
  };

  const resetPractice = () => {
    setLeftPencils(6);
    setRemovedPencils(0);
  };

  useEffect(() => {
    if (step === 1) resetPractice();
    if (step === 2) resetActivity2();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const goToNextPlanet = () => {
    completePlanet('saturn');
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate('/lesson/subtraction/uranus');
      setShowRocketTransition(false);
    }, 1600);
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
            
            <div className="bg-card rounded-xl p-10 border border-border mb-8 w-full max-w-md">
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
            <div className="flex items-center justify-center gap-3 mb-6">
              <h2 className="text-3xl font-semibold text-foreground">
                Take Away Pencils
              </h2>
              <ReadAloudButton text="Tap pencils to take them away. Start with 6 pencils." />
            </div>
            <p className="text-lg text-muted-foreground mb-10">
              Tap pencils to take them away
            </p>
            
            <div className="bg-card rounded-xl p-6 sm:p-10 border border-border mb-8 w-full max-w-lg">
              {/* Left side always shows all 6 pencils (taken ones fade in place);
                  taken pencils show up grayed on the right of the minus sign. */}
              <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                <div className="flex flex-wrap justify-center gap-2 min-w-[8rem] max-w-[12rem] sm:max-w-none">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const taken = i >= leftPencils;
                    return (
                      <Pencil
                        key={i}
                        onClick={!taken ? removePencil : undefined}
                        className={taken ? 'pointer-events-none opacity-25 grayscale' : ''}
                      />
                    );
                  })}
                </div>
                
                <span className="text-5xl font-bold text-saturn">−</span>
                
                <div className="flex gap-2 min-w-[100px] justify-center flex-wrap opacity-40 grayscale">
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
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-3xl font-semibold text-foreground">
                Leave {activity2Target} Pencils
              </h2>
              <ReadAloudButton text={`Take away until you have ${activity2Target} pencils. You start with ${activity2Start}.`} />
            </div>
            <p className="text-lg text-muted-foreground mb-8">
              Take away until you have {activity2Target}
            </p>
            
            <div className="flex justify-center gap-8 mb-8">
              <Counter count={activity2Pencils} label="You have" />
              <Counter count={activity2Target} label="You need" />
            </div>
            
            <div className="bg-card rounded-xl p-6 sm:p-10 border border-border mb-8 w-full max-w-lg">
              {/* Left side always shows the full starting group of 7 so the picture
                  keeps matching "7 − 3"; taken pencils gray out on the right. */}
              <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                <div className="flex flex-wrap justify-center gap-2 min-w-[8rem] max-w-[12rem] sm:max-w-none">
                  {Array.from({ length: activity2Start }).map((_, i) => {
                    const taken = i >= activity2Pencils;
                    return (
                      <Pencil
                        key={i}
                        onClick={!activity2Checked && !taken ? removePencilActivity2 : undefined}
                        className={
                          taken
                            ? 'pointer-events-none opacity-25 grayscale'
                            : activity2Checked
                              ? 'pointer-events-none'
                              : ''
                        }
                      />
                    );
                  })}
                </div>
                
                <span className="text-5xl font-bold text-saturn">−</span>
                
                <div className="flex gap-2 min-w-[100px] justify-center flex-wrap opacity-40 grayscale">
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
            
            {activity2Checked && !showGuided && (
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
                        Let's practice with pencils!
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

            {showGuided && (
              <GuidedPractice
                lessonType="subtraction"
                num1={activity2Start}
                num2={activity2Start - activity2Target}
                storyHint={`Leave ${activity2Target} pencils. You start with ${activity2Start}.`}
                onClose={() => {
                  setShowGuided(false);
                  resetActivity2();
                }}
              />
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
              You learned how to subtract. Celebrate what you learned:
            </p>
            
            <div className="mb-10 w-full px-2">
              <LessonCelebration lessonType="subtraction" />
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
    <LessonShell
      planet="saturn"
      totalSteps={totalSteps}
      step={step}
      onBack={step > 0 ? () => setStep(step - 1) : () => navigate('/planets')}
      onNext={step < 3 ? () => setStep(step + 1) : undefined}
      showNext={step < 3}
    >
      {renderStep()}
    </LessonShell>
  );
};

export default SubtractionSaturn;
