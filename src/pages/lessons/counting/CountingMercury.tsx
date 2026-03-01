// Counting Lesson - Mercury ("You need...they have" activity)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import NavigationArrows from '@/components/NavigationArrows';
import Apple from '@/components/Apple';
import Basket from '@/components/Basket';
import Counter from '@/components/Counter';
import PlanetTransition from '@/components/PlanetTransition';
import HomeButton from '@/components/HomeButton';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

const CountingMercury: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition, completePlanet } = useGame();
  const [step, setStep] = useState(0);
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
    setWordProblemCorrect(wordProblemCount === targetCount);
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
    }, 2500);
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
              <p className="text-lg text-foreground">
                Jo needs <span className="font-bold text-primary text-xl">{targetCount} apples</span> for a pie.
              </p>
              <p className="text-muted-foreground mt-2">
                Can you put the right amount?
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-8">
                <Counter count={wordProblemCount} label="You have" />
                <Counter count={targetCount} label="You need" />
              </div>
              
              <Basket>
                {Array.from({ length: wordProblemCount }).map((_, i) => (
                  <Apple key={i} size="md" className="pointer-events-none" />
                ))}
              </Basket>
              
              {!wordProblemChecked && (
                <div className="flex flex-wrap justify-center gap-3 max-w-md">
                  {Array.from({ length: wordProblemAvailable }).map((_, i) => (
                    <Apple key={i} onClick={addAppleToWordProblem} size="lg" />
                  ))}
                </div>
              )}
              
              {!wordProblemChecked ? (
                <Button onClick={checkWordProblem} className="mt-4" size="lg">
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
                      <Button onClick={resetWordProblem} variant="outline" size="lg">
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
              You practiced counting! Watch this fun video:
            </p>
            
            <div className="bg-card rounded-xl p-10 border border-border max-w-xl mx-auto mb-10">
              <div className="aspect-video bg-muted rounded-lg">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/DR-cfDsHCGA"
                  title="Counting Fun"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                />
              </div>
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
    <div className="min-h-screen bg-background subtle-stars flex flex-col p-4 md:p-8">
      <HomeButton />
      
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i === step ? 'bg-mercury' : i < step ? 'bg-mercury/50' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto">
        {renderStep()}
      </div>

      {step < 1 && (
        <NavigationArrows
          onBack={() => navigate('/lesson/counting/sun')}
          onNext={() => setStep(step + 1)}
          showNext={wordProblemCorrect}
          backLabel="Back"
          nextLabel="Next"
        />
      )}
    </div>
  );
};

export default CountingMercury;
