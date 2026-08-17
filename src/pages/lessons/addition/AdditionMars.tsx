// Addition Lesson - Mars (Concept + Word Problem + ML)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useLessonStep } from '@/hooks/useLessonStep';
import NavigationArrows from '@/components/NavigationArrows';
import ConceptVisual from '@/components/ConceptVisual';
import Pencil from '@/components/Pencil';
import Counter from '@/components/Counter';
import PlanetTransition from '@/components/PlanetTransition';
import HomeButton from '@/components/HomeButton';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

import { createFeatures } from '@/lib/recommendation/features';
import { predictRecommendation } from '@/lib/recommendation/model';

const AdditionMars: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition, completePlanet } = useGame();
  const [step, setStep] = useLessonStep('mars');
  const [conceptStep, setConceptStep] = useState(1);
  const [showTransition, setShowTransition] = useState(false);

  // ------------------------------------------------------------
  // ML recommendation
  // ------------------------------------------------------------

  const [recommendation, setRecommendation] = useState<
    'review' | 'practice' | 'advance' | 'challenge' | null
  >(null);

  // ------------------------------------------------------------
  // Word problem state
  // ------------------------------------------------------------

  const [wordLeft] = useState(3);
  const [wordTarget] = useState(7);
  const [wordRight, setWordRight] = useState(0);
  const [wordAvailable, setWordAvailable] = useState(5);
  const [wordChecked, setWordChecked] = useState(false);

  // Track simple performance data for ML
  const [attempts, setAttempts] = useState(0);
  const [activityStartTime] = useState(() => Date.now());

  const totalSteps = 2;

  // ------------------------------------------------------------
  // Concept animation
  // ------------------------------------------------------------

  useEffect(() => {
    if (step === 0 && conceptStep < 5) {
      const timer = setTimeout(() => {
        setConceptStep((prev) => prev + 1);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [step, conceptStep]);

  // ------------------------------------------------------------
  // Add pencils
  // ------------------------------------------------------------

  const addPencilWord = () => {
    if (
      wordAvailable > 0 &&
      !wordChecked &&
      wordLeft + wordRight < wordTarget
    ) {
      setWordRight((prev) => prev + 1);
      setWordAvailable((prev) => prev - 1);
    }
  };

  // ------------------------------------------------------------
  // Check answer + ML recommendation
  // ------------------------------------------------------------

  const checkWord = () => {
    const total = wordLeft + wordRight;
    const correct = total === wordTarget;

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    console.log('✅ Mars Check button clicked');

    console.log('🪐 Mars Word Problem:', {
      left: wordLeft,
      right: wordRight,
      total,
      target: wordTarget,
      correct,
    });

    setWordChecked(true);

    // ----------------------------------------------------------
    // ML PERFORMANCE DATA
    // ----------------------------------------------------------

    const elapsedSeconds = Math.max(
      1,
      Math.round((Date.now() - activityStartTime) / 1000)
    );

    const totalAnswers = 1;
    const correctAnswers = correct ? 1 : 0;

    const features = createFeatures({
      // Mars = planet 5 in the lesson sequence.
      planet: 5,

      // Word problem is slightly harder than Earth's basic
      // pencil-addition activity.
      lessonDifficulty: 5,

      correctAnswers,
      totalAnswers,

      totalTimeSeconds: elapsedSeconds,

      hints: 0,

      retries: Math.max(0, nextAttempts - 1),

      improvement: correct ? 100 : 0,

      consistency: correct ? 100 : 0,

      streak: correct ? 1 : 0,
    });

    const result = predictRecommendation(features);

    console.log('🤖 Mars ML Recommendation:', result);
    console.log('🤖 Mars ML Features:', features);

    setRecommendation(result);
  };

  // ------------------------------------------------------------
  // Reset activity
  // ------------------------------------------------------------

  const resetWord = () => {
    console.log('🔄 Mars activity reset');

    setWordRight(0);
    setWordAvailable(5);
    setWordChecked(false);
    setRecommendation(null);
  };

  // ------------------------------------------------------------
  // Move to Jupiter
  // ------------------------------------------------------------

  const goToNextPlanet = () => {
    completePlanet('mars');
    setShowRocketTransition(true);

    setTimeout(() => {
      navigate('/lesson/addition/jupiter');
    }, 2500);
  };

  // ------------------------------------------------------------
  // Transition
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // Lesson steps
  // ------------------------------------------------------------

  const renderStep = () => {
    switch (step) {
      // ==========================================================
      // STEP 0 - CONCEPT
      // ==========================================================

      case 0:
        return (
          <div className="text-center max-w-3xl mx-auto flex flex-col items-center justify-center flex-1 py-8">
            <h2 className="text-3xl font-semibold text-foreground mb-10">
              What is Addition?
            </h2>

            <ConceptVisual
              type="addition"
              step={conceptStep}
            />
          </div>
        );

      // ==========================================================
      // STEP 1 - WORD PROBLEM
      // ==========================================================

      case 1:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1 relative z-10">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              The Art Shop
            </h2>

            <div className="bg-card rounded-xl p-8 border border-border mb-8 max-w-lg mx-auto">
              <p className="text-lg text-foreground">
                Emma has{' '}
                <span className="font-bold text-mars">
                  {wordLeft} pencils
                </span>
                .
              </p>

              <p className="text-lg text-foreground mt-3">
                She wants{' '}
                <span className="font-bold text-mars">
                  {wordTarget} pencils
                </span>{' '}
                total.
              </p>

              <p className="text-muted-foreground mt-4 text-base">
                How many more does she need?
              </p>
            </div>

            {/* Counters */}
            <div className="flex justify-center gap-8 mb-8">
              <Counter
                count={wordLeft + wordRight}
                label="You have"
              />

              <Counter
                count={wordTarget}
                label="You need"
              />
            </div>

            {/* Pencil equation */}
            <div className="bg-card rounded-xl p-8 border border-border mb-8 relative z-10">
              <div className="flex items-center justify-center gap-10">
                <div className="flex gap-2">
                  {Array.from({ length: wordLeft }).map((_, i) => (
                    <Pencil
                      key={i}
                      className="pointer-events-none"
                    />
                  ))}
                </div>

                <span className="text-4xl font-bold text-mars">
                  +
                </span>

                <div className="flex gap-2 min-w-[100px] justify-center">
                  {Array.from({ length: wordRight }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pencil-appear"
                    >
                      <Pencil className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ==================================================
                ANSWER AREA
                ================================================== */}

            {!wordChecked && (
              <div className="relative z-50 flex flex-col items-center w-full">
                <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto mb-8 relative z-20">
                  {Array.from({ length: wordAvailable }).map((_, i) => (
                    <Pencil
                      key={i}
                      onClick={addPencilWord}
                    />
                  ))}
                </div>

                {/* Large clickable Check button */}
                <div className="relative z-50 flex justify-center">
                  <Button
                    type="button"
                    onClick={checkWord}
                    size="lg"
                    className="relative z-50 min-w-[160px] min-h-[52px] cursor-pointer pointer-events-auto"
                  >
                    Check
                  </Button>
                </div>
              </div>
            )}

            {/* ==================================================
                RESULT AREA
                ================================================== */}

            {wordChecked && (
              <div className="relative z-50 flex flex-col items-center gap-5">
                <div
                  className={`flex items-center gap-2 ${
                    wordLeft + wordRight === wordTarget
                      ? 'text-success'
                      : 'text-destructive'
                  }`}
                >
                  {wordLeft + wordRight === wordTarget ? (
                    <>
                      <Check className="w-8 h-8" />

                      <span className="text-xl font-semibold">
                        Great! Emma can draw now!
                      </span>
                    </>
                  ) : (
                    <>
                      <X className="w-8 h-8" />

                      <span className="text-xl font-semibold">
                        Emma needs{' '}
                        {wordTarget - (wordLeft + wordRight)} more
                        pencils
                      </span>
                    </>
                  )}
                </div>

                {/* ML recommendation */}
                {recommendation && (
                  <div className="bg-card rounded-xl p-5 border border-border max-w-xl">
                    <p className="text-lg font-semibold">
                      {recommendation === 'review' &&
                        "Let's review this a little more before moving on."}

                      {recommendation === 'practice' &&
                        "You're doing well! How about some more practice?"}

                      {recommendation === 'advance' &&
                        "Great job! You're ready for Jupiter! 🚀"}

                      {recommendation === 'challenge' &&
                        "Wow! You're doing amazing! Ready for a challenge on Jupiter? 🚀"}
                    </p>
                  </div>
                )}

                {/* Incorrect answer */}
                {wordLeft + wordRight !== wordTarget && (
                  <Button
                    type="button"
                    onClick={resetWord}
                    variant="outline"
                    size="lg"
                    className="relative z-50 min-w-[160px] cursor-pointer pointer-events-auto"
                  >
                    Try Again
                  </Button>
                )}

                {/* Correct answer */}
                {wordLeft + wordRight === wordTarget && (
                  <Button
                    type="button"
                    onClick={() => setShowTransition(true)}
                    size="lg"
                    className="relative z-50 min-w-[180px] cursor-pointer pointer-events-auto"
                  >
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

  // ------------------------------------------------------------
  // Page
  // ------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col p-4 md:p-8">
      <HomeButton />

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-6 relative z-10">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i === step
                ? 'bg-mars'
                : i < step
                  ? 'bg-mars/50'
                  : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Lesson content */}
      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto relative z-10">
        {renderStep()}
      </div>

      {/* Bottom navigation */}
      <div className="relative z-10">
        <NavigationArrows
          onBack={
            step > 0
              ? () => setStep(step - 1)
              : () => navigate('/planets')
          }
          onNext={
            step < totalSteps - 1
              ? () => setStep(step + 1)
              : undefined
          }
          showNext={step < totalSteps - 1}
          backLabel="Back"
          nextLabel="Next"
        />
      </div>
    </div>
  );
};

export default AdditionMars;