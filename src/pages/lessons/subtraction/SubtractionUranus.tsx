// Subtraction Lesson - Uranus (Concept + Word Problem)
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

const SubtractionUranus: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition } = useGame();
  const [step, setStep] = useState(0);
  const [conceptStep, setConceptStep] = useState(1);
  const [showTransition, setShowTransition] = useState(false);
  
  // Word problem state
  const [wordPencils, setWordPencils] = useState(8);
  const [wordRemoved, setWordRemoved] = useState(0);
  const [wordTarget] = useState(5);
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

  const removePencilWord = () => {
    if (wordPencils > 0 && !wordChecked) {
      setWordPencils(prev => prev - 1);
      setWordRemoved(prev => prev + 1);
    }
  };

  const checkWord = () => {
    setWordChecked(true);
  };

  const resetWord = () => {
    setWordPencils(8);
    setWordRemoved(0);
    setWordChecked(false);
  };

  const goToNextPlanet = () => {
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate('/lesson/subtraction/neptune');
    }, 2500);
  };

  if (showTransition) {
    return (
      <PlanetTransition
        currentPlanet="Uranus"
        nextPlanet="Neptune"
        currentPlanetColor="bg-uranus"
        nextPlanetColor="bg-neptune"
        topic="Subtraction"
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
              What is Subtraction?
            </h2>
            <ConceptVisual type="subtraction" step={conceptStep} />
          </div>
        );

      case 1:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              The Classroom
            </h2>
            <div className="bg-card rounded-xl p-8 border border-border mb-8 max-w-lg mx-auto">
              <p className="text-lg text-foreground">
                Mr. Chen has <span className="font-bold text-uranus">8 pencils</span>.
              </p>
              <p className="text-lg text-foreground mt-3">
                He wants to keep <span className="font-bold text-uranus">{wordTarget} pencils</span>.
              </p>
              <p className="text-muted-foreground mt-4 text-base">
                How many can he give away?
              </p>
            </div>
            
            <div className="flex justify-center gap-8 mb-8">
              <Counter count={wordPencils} label="You have" />
              <Counter count={wordTarget} label="You need" />
            </div>
            
            <div className="bg-card rounded-xl p-8 border border-border mb-8">
              <div className="flex items-center justify-center gap-10">
                <div className="flex gap-2 min-w-[150px] justify-center flex-wrap">
                  {Array.from({ length: wordPencils }).map((_, i) => (
                    <Pencil 
                      key={i} 
                      onClick={!wordChecked ? removePencilWord : undefined}
                      className={wordChecked ? 'pointer-events-none' : ''}
                    />
                  ))}
                </div>
                <span className="text-4xl font-bold text-uranus">−</span>
                <div className="flex gap-2 min-w-[80px] justify-center opacity-40">
                  {Array.from({ length: wordRemoved }).map((_, i) => (
                    <div key={i} className="animate-pencil-appear">
                      <Pencil className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {!wordChecked && (
              <Button onClick={checkWord} size="lg">Check</Button>
            )}
            
            {wordChecked && (
              <div className="flex flex-col items-center gap-4">
                <div className={`flex items-center gap-2 ${
                  wordPencils === wordTarget ? 'text-success' : 'text-destructive'
                }`}>
                  {wordPencils === wordTarget ? (
                    <>
                      <Check className="w-8 h-8" />
                      <span className="text-xl font-semibold">Great! Mr. Chen gave away {wordRemoved}!</span>
                    </>
                  ) : (
                    <>
                      <X className="w-8 h-8" />
                      <span className="text-xl font-semibold">
                        Mr. Chen needs to give away {8 - wordTarget}
                      </span>
                    </>
                  )}
                </div>
                {wordPencils !== wordTarget ? (
                  <Button onClick={resetWord} variant="outline" size="lg">
                    Try Again
                  </Button>
                ) : (
                  <Button onClick={() => setShowTransition(true)} size="lg">
                    Go to Neptune
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
              i === step ? 'bg-uranus' : i < step ? 'bg-uranus/50' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto">
        {renderStep()}
      </div>

      {step < 1 && (
        <NavigationArrows
          onBack={() => navigate('/lesson/subtraction/saturn')}
          onNext={() => setStep(step + 1)}
          showNext={true}
          backLabel="Back"
          nextLabel="Next"
        />
      )}
    </div>
  );
};

export default SubtractionUranus;
