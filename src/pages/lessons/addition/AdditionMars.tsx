import { saveDiagnosisSafely } from '@/lib/saveDiagnosisSafely';
import LessonDrill from '@/components/LessonDrill';
import { insertedCount } from '@/lib/lessonDuration';
import { tx } from '@/i18n/tx';
// Addition Lesson - Mars (Concept + Word Problem)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useLessonStep } from '@/hooks/useLessonStep';
import { usePlanetHandoff } from '@/hooks/usePlanetHandoff';
import PracticeAgainButton from '@/components/PracticeAgainButton';
import ConceptVisual from '@/components/ConceptVisual';
import Pencil from '@/components/Pencil';
import Counter from '@/components/Counter';
import PlanetTransition from '@/components/PlanetTransition';
import LessonShell from '@/components/LessonShell';
import ReadAloudButton from '@/components/ReadAloudButton';
import EquationBuilder from '@/components/EquationBuilder';
import GuidedPractice from '@/components/GuidedPractice';
import ThoughtCard from '@/components/ThoughtCard';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { diagnoseTrace, LessonTrace, type Diagnosis } from '@/lib/cognition';

const AdditionMars: React.FC = () => {
  const navigate = useNavigate();
  const { saveDiagnosis } = useGame();
  const { leave } = usePlanetHandoff();
  const [step, setStep] = useLessonStep('mars');
  const [conceptStep, setConceptStep] = useState(1);
  const [showTransition, setShowTransition] = useState(false);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const traceRef = useRef(new LessonTrace());
  
  // Word problem state
  const [wordLeft] = useState(3);
  const [wordTarget] = useState(7);
  const [wordRight, setWordRight] = useState(0);
  const [wordAvailable, setWordAvailable] = useState(5);
  const [wordChecked, setWordChecked] = useState(false);
  const [wordPhase, setWordPhase] = useState<'equation' | 'solve'>('equation');
  const [showGuided, setShowGuided] = useState(false);

  const wordNeed = wordTarget - wordLeft;
  const wordStoryText =
    `Emma has ${wordLeft} pencils. She wants ${wordTarget} pencils total. How many more does she need?`;

  const [drillReady, setDrillReady] = useState(false);
  const coreSteps = 2;
  const totalSteps = coreSteps + insertedCount;

  useEffect(() => {
    if (step === 0 && conceptStep < 6) {
      const timer = setTimeout(() => {
        setConceptStep(prev => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, conceptStep]);

  const publishDiagnosis = () => {
    const result = diagnoseTrace('mars', traceRef.current);
    setDiagnosis(result);
    saveDiagnosisSafely(saveDiagnosis, result);
  };

  const addPencilWord = () => {
    const wordOk = wordChecked && wordLeft + wordRight === wordTarget;
    if (wordAvailable > 0 && !wordOk && wordLeft + wordRight < 9) {
      const next = wordRight + 1;
      setWordRight(next);
      setWordAvailable(prev => prev - 1);
      traceRef.current.tap(wordLeft + next, wordTarget);
      if (wordChecked) setWordChecked(false);
    }
  };

  const checkWord = () => {
    const correct = wordLeft + wordRight === wordTarget;
    setWordChecked(true);
    traceRef.current.check(wordLeft + wordRight, wordTarget);
    if (!correct) {
      setShowGuided(true);
    }
    publishDiagnosis();
  };

  const resetWord = () => {
    setWordRight(0);
    setWordAvailable(5);
    setWordChecked(false);
    setShowGuided(false);
    traceRef.current.reset();
  };

  const practiceAgain = () => {
    resetWord();
    setWordPhase('equation');
    setDiagnosis(null);
    setStep(totalSteps - 1);
  };

  const goToNextPlanet = () => {
    leave('mars', '/lesson/addition/jupiter');
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
    if (step >= coreSteps - 1 && step < totalSteps - 1) {
      return <LessonDrill planet="mars" index={step - (coreSteps - 1)} onReady={setDrillReady} />;
    }
    switch (step) {
      case 0:
        return (
          <div className="text-center max-w-3xl mx-auto flex flex-col items-center justify-center flex-1 py-8">
            <h2 className="text-3xl font-semibold text-foreground mb-10">{tx('ui:s_eb8ab7b804')}</h2>
            <ConceptVisual type="addition" step={conceptStep} />
          </div>
        );

      case totalSteps - 1:
        if (wordPhase === 'equation') {
          return (
            <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
              <h2 className="text-3xl font-semibold text-foreground mb-4">{tx('ui:s_ca7ec0a715')}</h2>
              <p className="text-muted-foreground mb-6">{tx('ui:s_24b7bf6cdf')}</p>
              <EquationBuilder
                num1={wordLeft}
                num2={wordNeed}
                operator="+"
                questionText={wordStoryText}
                onResult={({ reverseAddends, usedTotal, correct }) => {
                  if (usedTotal || (!correct && reverseAddends)) {
                    traceRef.current.setEquationSwap(true);
                  }
                }}
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
            <h2 className="text-3xl font-semibold text-foreground mb-4">{tx('ui:s_ca7ec0a715')}</h2>
            <div className="bg-card rounded-xl p-8 border border-border mb-6 max-w-lg mx-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="text-start flex-1">
                  <p className="text-lg text-foreground">{tx('ui:s_b6b0de9779')}<span className="font-bold text-mars">{wordLeft} pencils</span>.
                  </p>
                  <p className="text-lg text-foreground mt-3">{tx('ui:s_774f021d13')}<span className="font-bold text-mars">{wordTarget} pencils</span> total.
                  </p>
                  <p className="text-muted-foreground mt-4 text-base">{tx('ui:s_b741c8fa0f')}</p>
                </div>
                <ReadAloudButton text={wordStoryText} className="shrink-0" />
              </div>
            </div>

            <div className="rounded-xl bg-mars/10 border border-mars/20 px-4 py-3 mb-6 max-w-sm mx-auto">
              <p className="text-xs text-muted-foreground mb-2">{tx('ui:s_3e5c74ec88')}</p>
              <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-bold">
                <span className="inline-flex items-center justify-center min-w-11 h-11 rounded-xl bg-mars/20 text-mars border-2 border-mars">
                  {wordLeft}
                </span>
                <span className="text-mars">+</span>
                <span className="inline-flex items-center justify-center min-w-11 h-11 rounded-xl border-2 border-dashed border-mars text-mars bg-background">
                  {wordRight > 0 ? wordRight : '?'}
                </span>
                <span className="text-muted-foreground">=</span>
                <span className="inline-flex items-center justify-center min-w-11 h-11 rounded-xl bg-mars/20 text-mars border-2 border-mars">
                  {wordTarget}
                </span>
              </div>
            </div>
            
            <div className="flex justify-center gap-8 mb-8">
              <Counter count={wordLeft + wordRight} label={tx('ui:youHave')} />
              <Counter count={wordTarget} label={tx('ui:youNeed')} />
            </div>
            
            <div className="bg-card rounded-xl p-6 sm:p-8 border border-border mb-8 w-full max-w-lg">
              <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                <div className="flex flex-wrap justify-center gap-2 max-w-[10rem] sm:max-w-none">
                  {Array.from({ length: wordLeft }).map((_, i) => (
                    <Pencil key={i} className="pointer-events-none" />
                  ))}
                </div>
                <span className="text-4xl font-bold text-mars">+</span>
                <div className="flex flex-wrap justify-center gap-2 min-w-[4rem] max-w-[10rem] sm:max-w-none">
                  {Array.from({ length: wordRight }).map((_, i) => (
                    <div key={i} className="animate-pencil-appear">
                      <Pencil className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {!(wordChecked && wordLeft + wordRight === wordTarget) && (
              <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto mb-8">
                {Array.from({ length: wordAvailable }).map((_, i) => (
                  <Pencil key={i} onClick={addPencilWord} />
                ))}
              </div>
            )}
            {!wordChecked && (
              <Button onClick={checkWord} size="lg">{tx('ui:s_4b5e84be0e')}</Button>
            )}
            
            {wordChecked && !showGuided && (
              <div className="flex flex-col items-center gap-4">
                <div className={`flex items-center gap-2 ${
                  wordLeft + wordRight === wordTarget ? 'text-success' : 'text-destructive'
                }`}>
                  {wordLeft + wordRight === wordTarget ? (
                    <>
                      <Check className="w-8 h-8" />
                      <span className="text-xl font-semibold">{tx('ui:s_ba121c4060')}</span>
                    </>
                  ) : (
                    <>
                      <X className="w-8 h-8" />
                      <span className="text-xl font-semibold">{tx('ui:s_ff703fdb54')}</span>
                    </>
                  )}
                </div>
                {diagnosis && (
                  <ThoughtCard diagnosis={diagnosis} onPractice={practiceAgain} practiceLabel={tx('ui:practiceAgain')} />
                )}
                {wordLeft + wordRight !== wordTarget ? (
                  <Button onClick={resetWord} variant="outline" size="lg">{tx('ui:s_cef2fe093b')}</Button>
                ) : (
                  <>
                    <PracticeAgainButton onClick={practiceAgain} />
                    <Button onClick={() => setShowTransition(true)} size="lg">{tx('ui:s_7c45b0b733')}</Button>
                  </>
                )}
              </div>
            )}

            {showGuided && (
              <GuidedPractice
                lessonType="addition"
                num1={wordLeft}
                num2={wordNeed}
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
      planet="mars"
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
      onNext={step < totalSteps - 1 && (step < coreSteps - 1 || drillReady) ? () => setStep(step + 1) : undefined}
      showNext={step < totalSteps - 1 && (step < coreSteps - 1 || drillReady)}
    >
      {renderStep()}
    </LessonShell>
  );
};

export default AdditionMars;
