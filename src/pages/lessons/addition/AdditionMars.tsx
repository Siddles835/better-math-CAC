// Addition Lesson - Mars (Concept + Word Problem)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import NavigationArrows from '@/components/NavigationArrows';
import ConceptVisual from '@/components/ConceptVisual';
import Pencil from '@/components/Pencil';
import Counter from '@/components/Counter';
import PlanetTransition from '@/components/PlanetTransition';
import HomeButton from '@/components/HomeButton';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

const AdditionMars: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition } = useGame();
  const [step, setStep] = useState(0);
  const [conceptStep, setConceptStep] = useState(1);
  const [showTransition, setShowTransition] = useState(false);
  
  // Word problem state
  const [wordLeft] = useState(3);
  const [wordTarget] = useState(7);
  const [wordRight, setWordRight] = useState(0);
  const [wordAvailable, setWordAvailable] = useState(5);
  const [wordChecked, setWordChecked] = useState(false);

  const totalSteps = 2;

  useEffect(() => {
    if (step === 0 && conceptStep < 5) {
      const timer = setTimeout(() => {
        setConceptStep(prev => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, conceptStep]);

  const addPencilWord = () => {
    if (wordAvailable > 0 && !wordChecked && wordLeft + wordRight < 9) {
      setWordRight(prev => prev + 1);
      setWordAvailable(prev => prev - 1);
    }
  };

  const checkWord = () => {
    setWordChecked(true);
  };

  const resetWord = () => {
    setWordRight(0);
    setWordAvailable(5);
    setWordChecked(false);
  };

  const goToNextPlanet = () => {
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate('/lesson/addition/jupiter');
    }, 2500);
  };

  if (showTransition) {
    return (
      <PlanetTransition
        currentPlanet="Mars"
        nextPlanet="Jupiter"
        currentPlanetColor="bg-mars"
        nextPlanetColor="bg-jupiter"
        topic="Addition"
        onContinue={goToNextPlanet}
      />
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center max-w-3xl mx-auto flex flex-col items-center justify-center flex-1 py-8">
            <h2 className="text-3xl font-semibold text-foreground mb-10">
              What is Addition?
            </h2>
            <ConceptVisual type="addition" step={conceptStep} />
          </div>
        );

      case 1:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              The Art Shop
            </h2>
            <div className="bg-card rounded-xl p-8 border border-border mb-8 max-w-lg mx-auto">
              <p className="text-lg text-foreground">
                Emma has <span className="font-bold text-mars">{wordLeft} pencils</span>.
              </p>
              <p className="text-lg text-foreground mt-3">
                She wants <span className="font-bold text-mars">{wordTarget} pencils</span> total.
              </p>
              <p className="text-muted-foreground mt-4 text-base">
                How many more does she need?
              </p>
            </div>
            
            <div className="flex justify-center gap-8 mb-8">
              <Counter count={wordLeft + wordRight} label="You have" />
              <Counter count={wordTarget} label="You need" />
            </div>
            
            <div className="bg-card rounded-xl p-8 border border-border mb-8">
              <div className="flex items-center justify-center gap-10">
                <div className="flex gap-2">
                  {Array.from({ length: wordLeft }).map((_, i) => (
                    <Pencil key={i} className="pointer-events-none" />
                  ))}
                </div>
                <span className="text-4xl font-bold text-mars">+</span>
                <div className="flex gap-2 min-w-[100px] justify-center">
                  {Array.from({ length: wordRight }).map((_, i) => (
                    <div key={i} className="animate-pencil-appear">
                      <Pencil className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {!wordChecked && (
              <>
                <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto mb-8">
                  {Array.from({ length: wordAvailable }).map((_, i) => (
                    <Pencil key={i} onClick={addPencilWord} />
                  ))}
                </div>
                <Button onClick={checkWord} size="lg">Check</Button>
              </>
            )}
            
            {wordChecked && (
              <div className="flex flex-col items-center gap-4">
                <div className={`flex items-center gap-2 ${
                  wordLeft + wordRight === wordTarget ? 'text-success' : 'text-destructive'
                }`}>
                  {wordLeft + wordRight === wordTarget ? (
                    <>
                      <Check className="w-8 h-8" />
                      <span className="text-xl font-semibold">Great! Emma can draw now!</span>
                    </>
                  ) : (
                    <>
                      <X className="w-8 h-8" />
                      <span className="text-xl font-semibold">
                        Emma needs {wordTarget - wordLeft} more pencils
                      </span>
                    </>
                  )}
                </div>
                {wordLeft + wordRight !== wordTarget ? (
                  <Button onClick={resetWord} variant="outline" size="lg">
                    Try Again
                  </Button>
                ) : (
                  <Button onClick={() => setShowTransition(true)} size="lg">
                    Go to Jupiter
                  </Button>
                )}
              </div>
            )}
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
              i === step ? 'bg-mars' : i < step ? 'bg-mars/50' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto">
        {renderStep()}
      </div>

      {step < 1 && (
        <NavigationArrows
          onBack={() => navigate('/lesson/addition/earth')}
          onNext={() => setStep(step + 1)}
          showNext={true}
          backLabel="Back"
          nextLabel="Next"
        />
      )}
    </div>
  );
};

export default AdditionMars;
