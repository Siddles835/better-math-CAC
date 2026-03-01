// Counting Lesson - Sun (Activity/Practice with apples + Concept Explanation)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import NavigationArrows from '@/components/NavigationArrows';
import Apple from '@/components/Apple';
import Basket from '@/components/Basket';
import Counter from '@/components/Counter';
import ConceptVisual from '@/components/ConceptVisual';
import PlanetTransition from '@/components/PlanetTransition';
import HomeButton from '@/components/HomeButton';
import { Button } from '@/components/ui/button';

const CountingSun: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition, completePlanet } = useGame();
  const [step, setStep] = useState(0);
  const [basketCount, setBasketCount] = useState(0);
  const [availableApples, setAvailableApples] = useState(7);
  const [showTransition, setShowTransition] = useState(false);
  const [conceptStep, setConceptStep] = useState(1);

  const totalSteps = 4;

  useEffect(() => {
    if (step === 1 && conceptStep < 5) {
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
    }, 2500);
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
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-6">
              Put Apples in the Basket
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Click an apple to add it
            </p>
            
            <div className="flex flex-col items-center gap-8">
              <Counter count={basketCount} label="Apples" />
              
              <Basket>
                {Array.from({ length: basketCount }).map((_, i) => (
                  <Apple key={i} size="md" className="pointer-events-none" />
                ))}
              </Basket>
              
              <div className="flex flex-wrap justify-center gap-3 max-w-md">
                {Array.from({ length: availableApples }).map((_, i) => (
                  <Apple key={i} onClick={addAppleToBasket} size="lg" />
                ))}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="text-center max-w-3xl mx-auto flex flex-col items-center justify-center flex-1 py-8">
            <h2 className="text-3xl font-semibold text-foreground mb-10">
              What is Counting?
            </h2>
            <ConceptVisual type="counting" step={conceptStep} />
          </div>
        );

      case 2:
        return (
          <div className="text-center max-w-3xl mx-auto flex flex-col items-center justify-center flex-1 py-8 animate-fade-in">
            <h2 className="text-3xl font-semibold text-foreground mb-6">
              Count from 1 to 9!
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Each number tells us how many
            </p>
            <div className="grid grid-cols-3 gap-6 max-w-2xl mb-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <div 
                  key={num} 
                  className="bg-card rounded-xl p-4 border border-border flex flex-col items-center gap-3 animate-concept"
                  style={{ animationDelay: `${(num - 1) * 0.15}s` }}
                >
                  <span className="text-4xl font-bold text-primary">{num}</span>
                  <div className="flex flex-wrap justify-center gap-1 max-w-[80px]">
                    {Array.from({ length: num }).map((_, i) => (
                      <Apple key={i} size="sm" className="pointer-events-none" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][num - 1]}
                  </span>
                </div>
              ))}
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
              You learned how to count. Watch this video:
            </p>
            
            <div className="bg-card rounded-xl p-10 border border-border max-w-xl mx-auto mb-10">
              <div className="aspect-video bg-muted rounded-lg">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/TdDdUgOVqHI"
                  title="Counting Song"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                />
              </div>
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
    <div className="min-h-screen bg-background subtle-stars flex flex-col p-4 md:p-8">
      <HomeButton />
      
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i === step ? 'bg-sun' : i < step ? 'bg-sun/50' : 'bg-muted'
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

export default CountingSun;
