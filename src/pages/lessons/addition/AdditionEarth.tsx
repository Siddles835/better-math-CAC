// Addition Lesson - Earth (Activity/Practice with pencils)
import React, { useEffect, useRef, useState } from 'react';
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
import NumberDraw from '@/components/NumberDraw';
import ThoughtCard from '@/components/ThoughtCard';
import { Button } from '@/components/ui/button';
import { Check, X, Play, RotateCcw, ArrowRight } from 'lucide-react';
import { diagnoseTrace, LessonTrace, type Diagnosis, type DigitRead } from '@/lib/cognition';

const AdditionEarth: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition, completePlanet, saveDiagnosis } = useGame();
  const [step, setStep] = useLessonStep('earth');
  const [showTransition, setShowTransition] = useState(false);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const traceRef = useRef(new LessonTrace());
  
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
  const [showGuided, setShowGuided] = useState(false);

  const totalSteps = 4;

  const startAnimation = () => {
    setAnimationPhase('initial');
    setShowNewPencils(false);
    // Drop to 0 first so the counter actually announces "3" on the first play too.
    setDisplayCount(0);
    window.setTimeout(() => setDisplayCount(3), 50);

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

  const publishDiagnosis = () => {
    const result = diagnoseTrace('earth', traceRef.current);
    setDiagnosis(result);
    void saveDiagnosis(result);
  };

  const addPencilRight = () => {
    if (availablePencils > 0 && leftPencils + rightPencils < 9) {
      setRightPencils(prev => prev + 1);
      setAvailablePencils(prev => prev - 1);
    }
  };

  const addPencilActivity2 = () => {
    if (activity2Available > 0 && !activity2Checked && activity2Left + activity2Right < 9) {
      const next = activity2Right + 1;
      setActivity2Right(next);
      setActivity2Available(prev => prev - 1);
      traceRef.current.tap(activity2Left + next, activity2Target);
    }
  };

  const checkActivity2 = () => {
    const total = activity2Left + activity2Right;
    const isCorrect = total === activity2Target;
    setActivity2Checked(true);
    traceRef.current.check(total, activity2Target);
    if (!isCorrect) {
      setShowGuided(true);
    }
    publishDiagnosis();
  };

  const handleDrawnNumber = (read: DigitRead) => {
    traceRef.current.setDigit(read, activity2Left + activity2Right);
    publishDiagnosis();
  };

  const resetActivity2 = () => {
    setActivity2Right(0);
    setActivity2Available(6);
    setActivity2Checked(false);
    setShowGuided(false);
    traceRef.current.reset();
  };

  const resetPractice = () => {
    setRightPencils(0);
    setAvailablePencils(5);
  };

  useEffect(() => {
    if (step === 1) resetPractice();
    if (step === 2) resetActivity2();
    // Reset practice/target activities whenever the student returns to them.
  }, [step]);


  const goToNextPlanet = () => {
    completePlanet('earth');
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate('/lesson/addition/mars');
      setShowRocketTransition(false);
    }, 1600);
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
            
            <div className="bg-card rounded-xl p-10 border border-border mb-8 w-full max-w-md">
              <div className="flex justify-center items-end gap-2 sm:gap-3 mb-6 min-h-[120px] flex-wrap max-w-[16rem] sm:max-w-none mx-auto">
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
            <div className="flex items-center justify-center gap-3 mb-6">
              <h2 className="text-3xl font-semibold text-foreground">
                Add Pencils
              </h2>
              <ReadAloudButton text="Tap pencils to add them. Start with 3, then add more." />
            </div>
            <p className="text-lg text-muted-foreground mb-10">
              Tap pencils to add them
            </p>
            
            <div className="bg-card rounded-xl p-6 sm:p-10 border border-border mb-8 w-full max-w-lg">
              <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                <div className="flex flex-wrap justify-center gap-2 max-w-[10rem] sm:max-w-none">
                  {Array.from({ length: leftPencils }).map((_, i) => (
                    <Pencil key={i} className="pointer-events-none" />
                  ))}
                </div>
                
                <span className="text-5xl font-bold text-earth">+</span>
                
                <div className="flex flex-wrap justify-center gap-2 min-w-[4rem] max-w-[10rem] sm:max-w-none">
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
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-3xl font-semibold text-foreground">
                Make {activity2Target} Pencils
              </h2>
              <ReadAloudButton text={`Add until you have ${activity2Target} pencils. You start with ${activity2Left}.`} />
            </div>
            <p className="text-lg text-muted-foreground mb-8">
              Add until you have {activity2Target}
            </p>
            
            <div className="flex justify-center gap-8 mb-8">
              <Counter count={activity2Left + activity2Right} label="You have" />
              <Counter count={activity2Target} label="You need" />
            </div>
            
            <div className="bg-card rounded-xl p-6 sm:p-10 border border-border mb-8 w-full max-w-lg">
              <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                <div className="flex flex-wrap justify-center gap-2 max-w-[10rem] sm:max-w-none">
                  {Array.from({ length: activity2Left }).map((_, i) => (
                    <Pencil key={i} className="pointer-events-none" />
                  ))}
                </div>
                
                <span className="text-5xl font-bold text-earth">+</span>
                
                <div className="flex flex-wrap justify-center gap-2 min-w-[4rem] max-w-[10rem] sm:max-w-none">
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
            
            {activity2Checked && !showGuided && (
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
                        Let's practice with pencils!
                      </span>
                    </>
                  )}
                </div>
                {diagnosis && activity2Left + activity2Right === activity2Target && (
                  <ThoughtCard diagnosis={diagnosis} />
                )}
                <NumberDraw
                  prompt={`Write how many pencils you have (${activity2Left + activity2Right}).`}
                  expected={activity2Left + activity2Right}
                  onRead={handleDrawnNumber}
                />
                {activity2Left + activity2Right !== activity2Target && (
                  <Button onClick={resetActivity2} variant="outline" size="lg">
                    Try Again
                  </Button>
                )}
              </div>
            )}

            {showGuided && (
              <GuidedPractice
                lessonType="addition"
                num1={activity2Left}
                num2={activity2Target - activity2Left}
                storyHint={`Make ${activity2Target} pencils. You start with ${activity2Left}.`}
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
              Great Work on Earth!
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              You learned how to add. Celebrate what you learned:
            </p>
            
            <div className="mb-10 w-full px-2">
              <LessonCelebration lessonType="addition" />
            </div>

            {diagnosis && (
              <div className="mb-6 flex justify-center">
                <ThoughtCard
                  diagnosis={diagnosis}
                  onPractice={
                    diagnosis.primary !== 'STEADY'
                      ? () => {
                          setStep(2);
                          setActivity2Checked(false);
                          setShowGuided(false);
                        }
                      : undefined
                  }
                  practiceLabel="Practice this again"
                />
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <Button onClick={() => setShowTransition(true)} size="lg">
                <ArrowRight className="w-5 h-5 mr-2" />
                Go to Mars
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <LessonShell
      planet="earth"
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

export default AdditionEarth;
