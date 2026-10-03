import { saveDiagnosisSafely } from '@/lib/saveDiagnosisSafely';
import LessonDrill from '@/components/LessonDrill';
import { insertedCount } from '@/lib/lessonDuration';
import { tx } from '@/i18n/tx';
// Addition Lesson - Earth (Activity/Practice with pencils)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useLessonStep } from '@/hooks/useLessonStep';
import { usePlanetHandoff } from '@/hooks/usePlanetHandoff';
import PracticeAgainButton from '@/components/PracticeAgainButton';
import Pencil from '@/components/Pencil';
import Counter from '@/components/Counter';
import PlanetTransition from '@/components/PlanetTransition';
import LessonShell from '@/components/LessonShell';
import LessonCelebration from '@/components/LessonCelebration';
import ReadAloudButton from '@/components/ReadAloudButton';
import GuidedPractice from '@/components/GuidedPractice';
import NumberDraw from '@/components/NumberDraw';
import ThoughtCard from '@/components/ThoughtCard';
import { Button } from '@/components/ui/button';
import { Check, X, Play, RotateCcw, ArrowRight } from 'lucide-react';
import { diagnoseTrace, LessonTrace, type Diagnosis, type DigitRead } from '@/lib/cognition';
import { useAnswerCheck } from '@/hooks/useAnswerCheck';

const AdditionEarth: React.FC = () => {
  const navigate = useNavigate();
  const { saveDiagnosis } = useGame();
  const { leave } = usePlanetHandoff();
  const [step, setStep] = useLessonStep('earth');
  const [showTransition, setShowTransition] = useState(false);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const traceRef = useRef(new LessonTrace());
  
  // Animation state
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'initial' | 'animating' | 'final'>('idle');
  const [displayCount, setDisplayCount] = useState(3);
  const [arrivedPencils, setArrivedPencils] = useState(0);
  const [landing, setLanding] = useState(false);
  const timers = useRef<number[]>([]);
  
  // Activity state
  const [leftPencils] = useState(3);
  const [rightPencils, setRightPencils] = useState(0);
  const [availablePencils, setAvailablePencils] = useState(5);
  
  // Target activity state
  const [activity2Left] = useState(2);
  const [activity2Right, setActivity2Right] = useState(0);
  const [activity2Available, setActivity2Available] = useState(6);
  const [activity2Target] = useState(6);
  const [activity2Checked, setActivity2Checked] = useState(false);
  const [showGuided, setShowGuided] = useState(false);
  const drawCheck = useAnswerCheck();
  const activity2TotalRef = useRef(2);

  const [drillReady, setDrillReady] = useState(false);
  const coreSteps = 4;
  const totalSteps = coreSteps + insertedCount;

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  useEffect(() => clearTimers, []);

  const startAnimation = () => {
    clearTimers();
    setAnimationPhase('initial');
    setArrivedPencils(0);
    // Drop to 0 first so the counter actually announces "3" on the first play too.
    setDisplayCount(0);
    later(() => setDisplayCount(3), 400);
    // Each new pencil lands on its own, slowly enough to see.
    later(() => {
      setAnimationPhase('animating');
      setArrivedPencils(1);
      setDisplayCount(4);
    }, 1800);
    later(() => {
      setArrivedPencils(2);
      setDisplayCount(5);
    }, 3600);
    later(() => setAnimationPhase('final'), 5400);
  };

  const landThen = (fn: () => void) => {
    if (landing) return;
    setLanding(true);
    fn();
    later(() => setLanding(false), 1200);
  };

  const publishDiagnosis = () => {
    const result = diagnoseTrace('earth', traceRef.current);
    setDiagnosis(result);
    saveDiagnosisSafely(saveDiagnosis, result);
  };

  const addPencilRight = () => {
    if (landing) return;
    if (availablePencils > 0 && leftPencils + rightPencils < 9) {
      landThen(() => {
        setRightPencils(prev => prev + 1);
        setAvailablePencils(prev => prev - 1);
      });
    }
  };

  const activity2Total = activity2Left + activity2Right;
  activity2TotalRef.current = activity2Total;
  const activity2Ok = activity2Checked && activity2Total === activity2Target;

  const addPencilActivity2 = () => {
    if (activity2Ok || landing) return;
    if (activity2Available > 0 && activity2Left + activity2Right < 9) {
      landThen(() => {
      const next = activity2Right + 1;
      setActivity2Right(next);
      setActivity2Available(prev => prev - 1);
      traceRef.current.tap(activity2Left + next, activity2Target);
      if (activity2Checked) {
        setActivity2Checked(false);
        setDiagnosis(null);
      }
      drawCheck.noteChange();
      });
    }
  };

  const checkActivity2 = () => {
    const total = activity2Left + activity2Right;
    const isCorrect = total === activity2Target;
    setActivity2Checked(true);
    traceRef.current.check(total, activity2Target);
    if (!isCorrect) {
      setShowGuided(true);
    }
    publishDiagnosis();
  };

  const handleDrawnNumber = (read: DigitRead) => {
    const total = activity2TotalRef.current;
    if (read.status === 'unreadable') {
      drawCheck.submit('unreadable');
      return;
    }
    const correct = read.digit === total;
    const next = drawCheck.submit(correct ? 'correct' : 'incorrect');
    if (!next) return;
    traceRef.current.setDigit(read, total);
    traceRef.current.check(read.digit, total);
    publishDiagnosis();
  };

  const resetDraw = drawCheck.reset;
  const resetActivity2 = useCallback(() => {
    setActivity2Right(0);
    setActivity2Available(6);
    setActivity2Checked(false);
    setShowGuided(false);
    setDiagnosis(null);
    resetDraw();
    traceRef.current.reset();
  }, [resetDraw]);

  const practiceAgain = () => {
    resetActivity2();
    setStep(2);
  };

  const resetPractice = useCallback(() => {
    setRightPencils(0);
    setAvailablePencils(5);
  }, []);

  useEffect(() => {
    if (step === 1) resetPractice();
    if (step === 2) resetActivity2();
    // Reset practice/target activities whenever the student returns to them.
  }, [step, resetPractice, resetActivity2]);


  const goToNextPlanet = () => {
    leave('earth', '/lesson/addition/mars');
  };

  if (showTransition) {
    return (
      <PlanetTransition
        currentPlanet="Earth"
        nextPlanet="Mars"
        currentPlanetColor="bg-earth"
        nextPlanetColor="bg-mars"
        topic="Addition"
        onContinue={goToNextPlanet}
      />
    );
  }

  const renderStep = () => {
    if (step >= coreSteps - 1 && step < totalSteps - 1) {
      return <LessonDrill planet="earth" index={step - (coreSteps - 1)} onReady={setDrillReady} />;
    }
    switch (step) {
      case 0:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-8">{tx('ui:s_83f48b439a')}</h2>
            
            <div className="bg-card rounded-xl p-10 border border-border mb-8 w-full max-w-md">
              <div className="flex justify-center items-end gap-2 sm:gap-3 mb-6 min-h-[120px] flex-wrap max-w-[16rem] sm:max-w-none mx-auto">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i}>
                    <Pencil className="pointer-events-none" size="lg" />
                  </div>
                ))}
                {Array.from({ length: arrivedPencils }).map((_, i) => (
                  <div key={`new-${i}`} className="animate-pencil-appear">
                    <Pencil className="pointer-events-none" size="lg" />
                  </div>
                ))}
              </div>
              <Counter count={displayCount} />
              
              {animationPhase === 'final' && (
                <p className="mt-6 text-muted-foreground text-lg animate-fade-in">
                  <span dir="ltr">3 + 2 = 5</span>
                </p>
              )}
            </div>
            
            <div className="flex justify-center gap-4">
              {animationPhase === 'idle' && (
                <Button onClick={startAnimation} size="lg">
                  <Play className="w-5 h-5 me-2" />{tx('ui:s_d91ebf5887')}</Button>
              )}
              {animationPhase === 'final' && (
                <Button onClick={startAnimation} variant="outline" size="lg">
                  <RotateCcw className="w-5 h-5 me-2" />{tx('ui:s_180e2f4a3e')}</Button>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <div className="flex items-center justify-center gap-3 mb-6">
              <h2 className="text-3xl font-semibold text-foreground">{tx('ui:s_a3bea1c401')}</h2>
              <ReadAloudButton text={tx('ui:s_b67c39e1b8')} />
            </div>
            <p className="text-lg text-muted-foreground mb-10">{tx('ui:s_1475df6691')}</p>
            
            <div className="bg-card rounded-xl p-6 sm:p-10 border border-border mb-8 w-full max-w-lg">
              <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                <div className="flex flex-wrap justify-center gap-2 max-w-[10rem] sm:max-w-none">
                  {Array.from({ length: leftPencils }).map((_, i) => (
                    <Pencil key={i} className="pointer-events-none" />
                  ))}
                </div>
                
                <span className="text-5xl font-bold text-earth">+</span>
                
                <div className="flex flex-wrap justify-center gap-2 min-w-[4rem] max-w-[10rem] sm:max-w-none">
                  {Array.from({ length: rightPencils }).map((_, i) => (
                    <div key={i} className="animate-pencil-appear">
                      <Pencil className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8">
                <Counter count={leftPencils + rightPencils} label={tx('ui:totalLabel')} />
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto">
              {Array.from({ length: availablePencils }).map((_, i) => (
                <Pencil key={i} onClick={addPencilRight} />
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div data-testid="practice-activity" className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-3xl font-semibold text-foreground">
                Make {activity2Target} Pencils
              </h2>
              <ReadAloudButton text={`Add until you have ${activity2Target} pencils. You start with ${activity2Left}.`} />
            </div>
            <p className="text-lg text-muted-foreground mb-8">
              Add until you have {activity2Target}
            </p>
            
            <div className="flex justify-center gap-8 mb-8">
              <Counter count={activity2Left + activity2Right} label={tx('ui:youHave')} />
              <Counter count={activity2Target} label={tx('ui:youNeed')} />
            </div>
            
            <div className="bg-card rounded-xl p-6 sm:p-10 border border-border mb-8 w-full max-w-lg">
              <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                <div className="flex flex-wrap justify-center gap-2 max-w-[10rem] sm:max-w-none">
                  {Array.from({ length: activity2Left }).map((_, i) => (
                    <Pencil key={i} className="pointer-events-none" />
                  ))}
                </div>
                
                <span className="text-5xl font-bold text-earth">+</span>
                
                <div className="flex flex-wrap justify-center gap-2 min-w-[4rem] max-w-[10rem] sm:max-w-none">
                  {Array.from({ length: activity2Right }).map((_, i) => (
                    <div key={i} className="animate-pencil-appear">
                      <Pencil className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {!activity2Ok && (
              <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto mb-8">
                {Array.from({ length: activity2Available }).map((_, i) => (
                  <Pencil key={i} onClick={addPencilActivity2} testId="add-pencil" />
                ))}
              </div>
            )}
            {!activity2Checked && (
              <Button onClick={checkActivity2} size="lg">{tx('ui:s_4b5e84be0e')}</Button>
            )}
            
            {activity2Checked && !showGuided && (
              <div className="flex flex-col items-center gap-4">
                <div className={`flex items-center gap-2 ${
                  activity2Left + activity2Right === activity2Target ? 'text-success' : 'text-destructive'
                }`}>
                  {activity2Left + activity2Right === activity2Target ? (
                    <>
                      <Check className="w-8 h-8" />
                      <span className="text-xl font-semibold">{tx('ui:s_91bb266617')}</span>
                    </>
                  ) : (
                    <>
                      <X className="w-8 h-8" />
                      <span className="text-xl font-semibold">{tx('ui:s_ff703fdb54')}</span>
                    </>
                  )}
                </div>
                {diagnosis && activity2Left + activity2Right === activity2Target && (
                  <ThoughtCard diagnosis={diagnosis} />
                )}
                <NumberDraw
                  key="earth-pencils"
                  prompt={tx('ui:s_58d5dc6735')}
                  result={drawCheck.state.verdict}
                  unreadableReason={drawCheck.state.verdict === 'unreadable' ? 'low_confidence' : null}
                  checkEnabled={drawCheck.canSubmit(true)}
                  disabled={drawCheck.state.lockedSuccess}
                  showTypeHint={drawCheck.state.unreadableStreak >= 3}
                  onChange={() => drawCheck.noteChange()}
                  onRead={handleDrawnNumber}
                />
                {activity2Left + activity2Right !== activity2Target && (
                  <Button onClick={resetActivity2} variant="outline" size="lg">{tx('ui:s_cef2fe093b')}</Button>
                )}
              </div>
            )}

            {showGuided && (
              <GuidedPractice
                lessonType="addition"
                num1={activity2Left}
                num2={activity2Target - activity2Left}
                storyHint="Add pencils one at a time, then count what you have."
                onClose={() => {
                  setShowGuided(false);
                  resetActivity2();
                }}
              />
            )}
          </div>
        );

      case totalSteps - 1:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">{tx('ui:s_c95e71fc29')}</h2>
            <p className="text-xl text-muted-foreground mb-10">{tx('ui:s_1fb7fd4aad')}</p>
            
            <div className="mb-10 w-full px-2">
              <LessonCelebration lessonType="addition" />
            </div>

            {diagnosis && (
              <div className="mb-6 flex justify-center">
                <ThoughtCard
                  diagnosis={diagnosis}
                  onPractice={practiceAgain}
                  practiceLabel={tx('ui:practiceAgain')}
                />
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <PracticeAgainButton onClick={practiceAgain} />
              <Button onClick={() => setShowTransition(true)} size="lg">
                <ArrowRight className="w-5 h-5 me-2" />{tx('ui:s_8c24362f19')}</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <LessonShell
      planet="earth"
      totalSteps={totalSteps}
      step={step}
      onBack={step > 0 ? () => setStep(step - 1) : () => navigate('/planets')}
      onNext={step < totalSteps - 1 && (step < coreSteps - 1 || drillReady) ? () => setStep(step + 1) : undefined}
      showNext={step < totalSteps - 1 && (step < coreSteps - 1 || drillReady)}
    >
      {renderStep()}
    </LessonShell>
  );
};

export default AdditionEarth;
