// Subtraction Lesson - Uranus (Concept + Word Problem)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useLessonStep } from '@/hooks/useLessonStep';
import ConceptVisual from '@/components/ConceptVisual';
import Pencil from '@/components/Pencil';
import Counter from '@/components/Counter';
import PlanetTransition from '@/components/PlanetTransition';
import LessonShell from '@/components/LessonShell';
import ReadAloudButton from '@/components/ReadAloudButton';
import EquationBuilder from '@/components/EquationBuilder';
import GuidedPractice from '@/components/GuidedPractice';
import { Button } from '@/components/ui/button';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { Check, X } from 'lucide-react';

const SubtractionUranus: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition, completePlanet } = useGame();
  const [step, setStep] = useLessonStep('uranus');
  const [conceptStep, setConceptStep] = useState(1);
  const [showTransition, setShowTransition] = useState(false);
  
  // Word problem state
  const [wordStart] = useState(8);
  const [wordPencils, setWordPencils] = useState(8);
  const [wordRemoved, setWordRemoved] = useState(0);
  const [wordTarget] = useState(5);
  const [wordChecked, setWordChecked] = useState(false);
  const [wordPhase, setWordPhase] = useState<'equation' | 'solve'>('equation');
  const [showGuided, setShowGuided] = useState(false);

  const wordGiveAway = wordStart - wordTarget;
  const wordStoryText =
    `Mr. Chen has ${wordStart} pencils. He wants to keep ${wordTarget} pencils. How many can he give away?`;

  const totalSteps = 2;

  useEffect(() => {
    if (step === 0 && conceptStep < 6) {
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
    if (wordPencils !== wordTarget) {
      hapticError();
      setShowGuided(true);
    } else {
      hapticSuccess();
    }
  };

  const resetWord = () => {
    setWordPencils(wordStart);
    setWordRemoved(0);
    setWordChecked(false);
    setShowGuided(false);
  };

  const goToNextPlanet = () => {
    completePlanet('uranus');
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate('/lesson/subtraction/neptune');
      setShowRocketTransition(false);
    }, 1600);
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
        if (wordPhase === 'equation') {
          return (
            <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
              <h2 className="text-3xl font-semibold text-foreground mb-4">
                The Classroom
              </h2>
              <p className="text-muted-foreground mb-6">
                First build the equation, then solve with pencils!
              </p>
              <EquationBuilder
                num1={wordStart}
                num2={wordGiveAway}
                operator="−"
                questionText={wordStoryText}
                onComplete={() => {
                  resetWord();
                  setWordPhase('solve');
                }}
              />
            </div>
          );
        }

        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              The Classroom
            </h2>
            <div className="bg-card rounded-xl p-8 border border-border mb-6 max-w-lg mx-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="text-left flex-1">
                  <p className="text-lg text-foreground">
                    Mr. Chen has <span className="font-bold text-uranus">{wordStart} pencils</span>.
                  </p>
                  <p className="text-lg text-foreground mt-3">
                    He wants to keep <span className="font-bold text-uranus">{wordTarget} pencils</span>.
                  </p>
                  <p className="text-muted-foreground mt-4 text-base">
                    How many can he give away?
                  </p>
                </div>
                <ReadAloudButton text={wordStoryText} className="shrink-0" />
              </div>
            </div>

            <div className="rounded-xl bg-uranus/10 border border-uranus/20 px-4 py-3 mb-6 max-w-sm mx-auto">
              <p className="text-xs text-muted-foreground mb-1">Your equation</p>
              <p className="text-2xl font-bold text-uranus">
                {wordStart} − {wordGiveAway} = ?
              </p>
            </div>
            
            <div className="flex justify-center gap-8 mb-8">
              <Counter count={wordPencils} label="You have" />
              <Counter count={wordTarget} label="You need" />
            </div>
            
            <div className="bg-card rounded-xl p-4 sm:p-8 border border-border mb-8 w-full max-w-lg">
              {/* Left side always shows the FULL starting group (8) so the picture
                  keeps matching "8 − 3". Clicked pencils fade in place and reappear
                  grayed out on the right-hand side of the minus sign. */}
              <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                <div className="flex gap-2 min-w-[8rem] justify-center flex-wrap max-w-[14rem] sm:max-w-none">
                  {Array.from({ length: wordStart }).map((_, i) => {
                    const givenAway = i >= wordPencils;
                    return (
                      <Pencil
                        key={i}
                        onClick={!wordChecked && !givenAway ? removePencilWord : undefined}
                        className={
                          givenAway
                            ? 'pointer-events-none opacity-25 grayscale'
                            : wordChecked
                              ? 'pointer-events-none'
                              : ''
                        }
                      />
                    );
                  })}
                </div>
                <span className="text-4xl font-bold text-uranus">−</span>
                <div className="flex gap-2 min-w-[80px] justify-center flex-wrap opacity-40 grayscale">
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
            
            {wordChecked && !showGuided && (
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
                        Let's practice with pencils!
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

            {showGuided && (
              <GuidedPractice
                lessonType="subtraction"
                num1={wordStart}
                num2={wordGiveAway}
                storyHint={wordStoryText}
                onClose={() => {
                  setShowGuided(false);
                  resetWord();
                }}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <LessonShell
      planet="uranus"
      totalSteps={totalSteps}
      step={step}
      onBack={
        step > 0
          ? () => {
              if (wordPhase === 'solve') {
                resetWord();
                setWordPhase('equation');
                return;
              }
              setStep(step - 1);
            }
          : () => navigate('/planets')
      }
      onNext={step < totalSteps - 1 ? () => setStep(step + 1) : undefined}
      showNext={step < totalSteps - 1}
    >
      {renderStep()}
    </LessonShell>
  );
};

export default SubtractionUranus;
