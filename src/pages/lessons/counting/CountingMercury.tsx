import { tx } from '@/i18n/tx';
import LessonDrill from '@/components/LessonDrill';
import { insertedCount } from '@/lib/lessonDuration';
// Counting Lesson - Mercury ("You need...they have" activity)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThoughtCard from '@/components/ThoughtCard';
import { useCognitionSession } from '@/hooks/useCognitionSession';
import { useLessonStep } from '@/hooks/useLessonStep';
import { usePlanetHandoff } from '@/hooks/usePlanetHandoff';
import PracticeAgainButton from '@/components/PracticeAgainButton';
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
  const { trace, diagnosis, publish, setDiagnosis } = useCognitionSession('mercury');
  const { leave } = usePlanetHandoff();
  const [step, setStep] = useLessonStep('mercury');
  const [showTransition, setShowTransition] = useState(false);
  
  // Word problem state
  const [targetCount] = useState(Math.floor(Math.random() * 4) + 3);
  const [wordProblemCount, setWordProblemCount] = useState(0);
  const [wordProblemAvailable, setWordProblemAvailable] = useState(7);
  const [wordProblemChecked, setWordProblemChecked] = useState(false);
  const [wordProblemCorrect, setWordProblemCorrect] = useState(false);

  const [drillReady, setDrillReady] = useState(false);
  const coreSteps = 2;
  const totalSteps = coreSteps + insertedCount;

  const addAppleToWordProblem = () => {
    if (wordProblemAvailable > 0 && !wordProblemCorrect && wordProblemCount < 9) {
      const next = wordProblemCount + 1;
      setWordProblemCount(next);
      setWordProblemAvailable(prev => prev - 1);
      trace.tap(next, targetCount);
      if (wordProblemChecked) setWordProblemChecked(false);
    }
  };

  const checkWordProblem = () => {
    setWordProblemChecked(true);
    const correct = wordProblemCount === targetCount;
    setWordProblemCorrect(correct);
    trace.check(wordProblemCount, targetCount);
    publish();
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

  const practiceAgain = () => {
    resetWordProblem();
    trace.reset();
    setDiagnosis(null);
    setStep(0);
  };

  const goToNextPlanet = () => {
    leave('mercury', '/lesson/counting/venus');
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
    if (step >= coreSteps - 1 && step < totalSteps - 1) {
      return <LessonDrill planet="mercury" index={step - (coreSteps - 1)} onReady={setDrillReady} />;
    }
    switch (step) {
      case 0:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">{tx('ui:s_6169527f21')}</h2>
            <div className="bg-card rounded-xl p-6 border border-border mb-8 max-w-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="text-start flex-1">
                  <p className="text-lg text-foreground">{tx('ui:joNeedsPie', { count: targetCount })}
                  </p>
                  <p className="text-muted-foreground mt-2">{tx('ui:s_639e98d98d')}</p>
                </div>
                <ReadAloudButton
                  text={tx('ui:joNeedsSpeak', { count: targetCount })}
                  className="shrink-0"
                />
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-8">
                <Counter count={wordProblemCount} label={tx('ui:youHave')} />
                <Counter count={targetCount} label={tx('ui:youNeed')} />
              </div>
              
              <Basket>
                {Array.from({ length: wordProblemCount }).map((_, i) => (
                  <Apple key={i} size="sm" className="pointer-events-none" />
                ))}
              </Basket>
              
              {!wordProblemCorrect && (
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-md">
                  {Array.from({ length: wordProblemAvailable }).map((_, i) => (
                    <Apple key={i} onClick={addAppleToWordProblem} size="md" />
                  ))}
                </div>
              )}
              
              {!wordProblemChecked ? (
                <Button onClick={checkWordProblem} className="mt-4 relative z-20" size="lg">{tx('ui:s_4b5e84be0e')}</Button>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  {wordProblemCorrect ? (
                    <div className="flex items-center gap-2 text-success">
                      <Check className="w-8 h-8" />
                      <span className="text-xl font-semibold">{tx('ui:s_a2d4f4d778')}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-2 text-destructive">
                        <X className="w-8 h-8" />
                        <span className="text-xl font-semibold">{tx('ui:s_6c5571c034')}</span>
                      </div>
                      <Button type="button" onClick={resetWordProblem} variant="outline" size="lg" className="min-h-[48px] relative z-20">{tx('ui:s_cef2fe093b')}</Button>
                    </div>
                  )}
                  {diagnosis && <ThoughtCard diagnosis={diagnosis} />}
                </div>
              )}
            </div>
          </div>
        );

      case totalSteps - 1:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">{tx('ui:s_497f706ef6')}</h2>
            <p className="text-xl text-muted-foreground mb-10">{tx('ui:s_37d7abfa1f')}</p>
            
            <div className="mb-10 w-full px-2">
              <LessonCelebration lessonType="counting" />
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <PracticeAgainButton onClick={practiceAgain} />
              <Button onClick={() => setShowTransition(true)} size="lg">{tx('ui:s_f490373037')}</Button>
            </div>
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
      onNext={step < totalSteps - 1 && (step === 0 ? wordProblemCorrect : drillReady) ? () => setStep(step + 1) : undefined}
      showNext={step < totalSteps - 1 && (step === 0 ? wordProblemCorrect : drillReady)}
    >
      {renderStep()}
    </LessonShell>
  );
};

export default CountingMercury;
