// Counting Lesson - Mercury ("You need...they have" activity)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useLessonStep } from '@/hooks/useLessonStep';
import Apple from '@/components/Apple';
import Basket from '@/components/Basket';
import Counter from '@/components/Counter';
import PlanetTransition from '@/components/PlanetTransition';
import LessonCelebration from '@/components/LessonCelebration';
import LessonShell from '@/components/LessonShell';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { Check, X } from 'lucide-react';

const CountingMercury: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition, completePlanet } = useGame();
  const [step, setStep] = useLessonStep('mercury');
  const [showTransition, setShowTransition] = useState(false);
  
  // Word problem state
  const [targetCount] = useState(Math.floor(Math.random() * 4) + 3);
  const [wordProblemCount, setWordProblemCount] = useState(0);
  const [wordProblemAvailable, setWordProblemAvailable] = useState(7);
  const [wordProblemChecked, setWordProblemChecked] = useState(false);
  const [wordProblemCorrect, setWordProblemCorrect] = useState(false);

  const totalSteps = 2;

  const addAppleToWordProblem = () => {
    if (wordProblemAvailable > 0 && !wordProblemChecked && wordProblemCount < 9) {
      setWordProblemCount(prev => prev + 1);
      setWordProblemAvailable(prev => prev - 1);
    }
  };

  const checkWordProblem = () => {
    setWordProblemChecked(true);
    const correct = wordProblemCount === targetCount;
    setWordProblemCorrect(correct);
    if (correct) {
      hapticSuccess();
    } else {
      hapticError();
    }
  };

  const resetWordProblem = () => {
    setWordProblemCount(0);
    setWordProblemAvailable(7);
    setWordProblemChecked(false);
    setWordProblemCorrect(false);
  };

  const goToNextPlanet = () => {
    completePlanet('mercury');
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate('/lesson/counting/venus');
      setShowRocketTransition(false);
    }, 1600);
  };

  if (showTransition) {
    return (
      <PlanetTransition
        currentPlanet="Mercury"
        nextPlanet="Venus"
        currentPlanetColor="bg-mercury"
        nextPlanetColor="bg-venus"
        topic="Counting"
        onContinue={goToNextPlanet}
      />
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Help Fill the Basket!
            </h2>
            <div className="bg-card rounded-xl p-6 border border-border mb-8 max-w-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="text-left flex-1">
                  <p className="text-lg text-foreground">
                    Jo needs <span className="font-bold text-primary text-xl">{targetCount} apples</span> for a pie.
                  </p>
                  <p className="text-muted-foreground mt-2">
                    Can you put the right amount?
                  </p>
                </div>
                <ReadAloudButton
                  text={`Jo needs ${targetCount} apples for a pie. Can you put the right amount?`}
                  className="shrink-0"
                />
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-8">
                <Counter count={wordProblemCount} label="You have" />
                <Counter count={targetCount} label="You need" />
              </div>
              
              <Basket>
                {Array.from({ length: wordProblemCount }).map((_, i) => (
                  <Apple key={i} size="sm" className="pointer-events-none" />
                ))}
              </Basket>
              
              {!wordProblemChecked && (
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-md">
                  {Array.from({ length: wordProblemAvailable }).map((_, i) => (
                    <Apple key={i} onClick={addAppleToWordProblem} size="md" />
                  ))}
                </div>
              )}
              
              {!wordProblemChecked ? (
                <Button onClick={checkWordProblem} className="mt-4 relative z-20" size="lg">
                  Check
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  {wordProblemCorrect ? (
                    <div className="flex items-center gap-2 text-success">
                      <Check className="w-8 h-8" />
                      <span className="text-xl font-semibold">Great job!</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-2 text-destructive">
                        <X className="w-8 h-8" />
                        <span className="text-xl font-semibold">Try again!</span>
                      </div>
                      <Button type="button" onClick={resetWordProblem} variant="outline" size="lg" className="min-h-[48px] relative z-20">
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Great Work on Mercury!
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              You practiced counting! Celebrate what you learned:
            </p>
            
            <div className="mb-10 w-full px-2">
              <LessonCelebration lessonType="counting" />
            </div>
            
            <Button onClick={() => setShowTransition(true)} size="lg">
              Go to Venus
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <LessonShell
      planet="mercury"
      totalSteps={totalSteps}
      step={step}
      onBack={step > 0 ? () => setStep(step - 1) : () => navigate('/planets')}
      onNext={step < totalSteps - 1 && wordProblemCorrect ? () => setStep(step + 1) : undefined}
      showNext={step < totalSteps - 1 && wordProblemCorrect}
    >
      {renderStep()}
    </LessonShell>
  );
};

export default CountingMercury;
