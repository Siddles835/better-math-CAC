// Counting Lesson - Sun (Activity/Practice with apples + Concept Explanation)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useLessonStep } from '@/hooks/useLessonStep';
import Apple from '@/components/Apple';
import Basket from '@/components/Basket';
import Counter from '@/components/Counter';
import ConceptVisual from '@/components/ConceptVisual';
import PlanetTransition from '@/components/PlanetTransition';
import LessonCelebration from '@/components/LessonCelebration';
import LessonShell from '@/components/LessonShell';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import { speak } from '@/lib/speech';
import { Volume2 } from 'lucide-react';

const CountingSun: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition, completePlanet } = useGame();
  const [step, setStep] = useLessonStep('sun');
  const [basketCount, setBasketCount] = useState(0);
  const [availableApples, setAvailableApples] = useState(7);
  const [showTransition, setShowTransition] = useState(false);
  const [conceptStep, setConceptStep] = useState(1);

  const totalSteps = 4;

  useEffect(() => {
    if (step === 1 && conceptStep < 7) {
      const timer = setTimeout(() => {
        setConceptStep(prev => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, conceptStep]);

  const addAppleToBasket = () => {
    if (availableApples > 0 && basketCount < 9) {
      setBasketCount(prev => prev + 1);
      setAvailableApples(prev => prev - 1);
    }
  };

  const goToNextPlanet = () => {
    completePlanet('sun');
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate('/lesson/counting/mercury');
      setShowRocketTransition(false);
    }, 1600);
  };

  if (showTransition) {
    return (
      <PlanetTransition
        currentPlanet="Sun"
        nextPlanet="Mercury"
        currentPlanetColor="bg-sun"
        nextPlanetColor="bg-mercury"
        topic="Counting"
        onContinue={goToNextPlanet}
      />
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1 py-2">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-3 sm:mb-6 px-2">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground">
                Put Apples in the Basket
              </h2>
              <ReadAloudButton text="Put apples in the basket. Tap an apple to add it." />
            </div>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-base sm:text-lg">
              Tap an apple to add it
            </p>
            
            <div className="flex flex-col items-center gap-4 sm:gap-6">
              <Counter count={basketCount} label="Apples" />
              
              <Basket>
                {Array.from({ length: basketCount }).map((_, i) => (
                  <Apple key={i} size="sm" className="pointer-events-none" />
                ))}
              </Basket>
              
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-sm">
                {Array.from({ length: availableApples }).map((_, i) => (
                  <Apple key={i} onClick={addAppleToBasket} size="md" />
                ))}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="text-center max-w-3xl mx-auto flex flex-col items-center justify-center flex-1 py-2 sm:py-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground mb-4 sm:mb-8 px-2">
              What is Counting?
            </h2>
            <ConceptVisual type="counting" step={conceptStep} />
          </div>
        );

      case 2:
        return (
          <div className="text-center max-w-3xl mx-auto flex flex-col items-center justify-center flex-1 py-2 sm:py-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-3 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground px-2">
                Count from 1 to 9!
              </h2>
              <ReadAloudButton text="one, two, three, four, five, six, seven, eight, nine" />
            </div>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-lg px-2">
              Each number tells us how many. Tap the speaker to hear them all, or tap a number to hear it.
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 w-full max-w-2xl mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const word = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][num - 1];
                return (
                  <div
                    key={num}
                    role="button"
                    tabIndex={0}
                    onClick={() => speak(word)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        speak(word);
                      }
                    }}
                    aria-label={`Hear the number ${num}, ${word}`}
                    className="bg-card rounded-xl p-2 sm:p-4 border border-border flex flex-col items-center gap-1.5 sm:gap-3 animate-concept transition-transform duration-200 hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer touch-manipulation"
                    style={{ animationDelay: `${(num - 1) * 0.15}s` }}
                  >
                    <span className="text-2xl sm:text-4xl font-bold text-primary leading-none">{num}</span>
                    <div className="flex flex-wrap justify-center gap-1 max-w-[80px] pointer-events-none">
                      {Array.from({ length: num }).map((_, i) => (
                        <Apple key={i} size="sm" className="pointer-events-none" />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">{word}</span>
                    <Volume2 className="w-4 h-4 text-primary/70" aria-hidden />
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Great Work on the Sun!
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              You learned how to count. Celebrate what you learned:
            </p>
            
            <div className="mb-10 w-full px-2">
              <LessonCelebration lessonType="counting" />
            </div>
            
            <Button onClick={() => setShowTransition(true)} size="lg">
              Go to Mercury
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <LessonShell
      planet="sun"
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

export default CountingSun;
