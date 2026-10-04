import { saveDiagnosisSafely } from '@/lib/saveDiagnosisSafely';
import LessonDrill from '@/components/LessonDrill';
import { insertedCount } from '@/lib/lessonDuration';
import { tx } from '@/i18n/tx';
// Subtraction Lesson - Saturn (Activity/Practice)
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import ThoughtCard from '@/components/ThoughtCard';
import { diagnoseTrace, LessonTrace, type Diagnosis } from '@/lib/cognition';
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
import { Button } from '@/components/ui/button';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { Check, X, Play, RotateCcw } from 'lucide-react';

const SubtractionSaturn: React.FC = () => {
  const navigate = useNavigate();
  const { saveDiagnosis } = useGame();
  const { leave } = usePlanetHandoff();
  const [step, setStep] = useLessonStep('saturn');
  const [showTransition, setShowTransition] = useState(false);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const traceRef = useRef(new LessonTrace());
  
  // Animation state
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'initial' | 'animating' | 'final'>('idle');
  const [displayCount, setDisplayCount] = useState(5);
  const [hidePencils, setHidePencils] = useState(false);
  
  // Activity state
  const [leftPencils, setLeftPencils] = useState(6);
  const [removedPencils, setRemovedPencils] = useState(0);
  
  // Target activity state
  const [activity2Pencils, setActivity2Pencils] = useState(7);
  const [activity2Removed, setActivity2Removed] = useState(0);
  const [activity2Target] = useState(4);
  const [activity2Checked, setActivity2Checked] = useState(false);
  const [showGuided, setShowGuided] = useState(false);
  const activity2Start = 7;

  const [drillReady, setDrillReady] = useState(false);
  const coreSteps = 4;
  const totalSteps = coreSteps + insertedCount;

  const startAnimation = () => {
    setAnimationPhase('initial');
    setHidePencils(false);
    // Drop to 0 first so the counter actually announces "5" on the first play too.
    setDisplayCount(0);
    window.setTimeout(() => setDisplayCount(5), 50);

    setTimeout(() => {
      setAnimationPhase('animating');
      setHidePencils(true);
    }, 1000);

    setTimeout(() => {
      setDisplayCount(3);
    }, 2000);

    setTimeout(() => {
      setAnimationPhase('final');
    }, 3000);
  };

  const removePencil = () => {
    if (leftPencils > 0) {
      setLeftPencils(prev => prev - 1);
      setRemovedPencils(prev => prev + 1);
    }
  };

  const removePencilActivity2 = () => {
    if (activity2Pencils > 0 && !(activity2Checked && activity2Pencils === activity2Target)) {
      const next = activity2Pencils - 1;
      setActivity2Pencils(next);
      setActivity2Removed(prev => prev + 1);
      traceRef.current.tap(next, activity2Target);
      if (activity2Checked) setActivity2Checked(false);
    }
  };

  const checkActivity2 = () => {
    setActivity2Checked(true);
    traceRef.current.check(activity2Pencils, activity2Target);
    const result = diagnoseTrace('saturn', traceRef.current);
    setDiagnosis(result);
    saveDiagnosisSafely(saveDiagnosis, result);
    if (activity2Pencils !== activity2Target) {
      hapticError();
      setShowGuided(true);
    } else {
      hapticSuccess();
    }
  };

  const resetActivity2 = () => {
    setActivity2Pencils(activity2Start);
    setActivity2Removed(0);
    setActivity2Checked(false);
    setShowGuided(false);
    setDiagnosis(null);
    traceRef.current.reset();
  };

  const practiceAgain = () => {
    resetActivity2();
    setStep(2);
  };

  const resetPractice = () => {
    setLeftPencils(6);
    setRemovedPencils(0);
  };

  useEffect(() => {
    if (step === 1) resetPractice();
    if (step === 2) resetActivity2();
    // Reset practice/target activities whenever the student returns to them.
  }, [step]);


  const goToNextPlanet = () => {
    leave('saturn', '/lesson/subtraction/uranus');
  };

  if (showTransition) {
    return (
      <PlanetTransition
        currentPlanet="Saturn"
        nextPlanet="Uranus"
        currentPlanetColor="bg-saturn"
        nextPlanetColor="bg-uranus"
        topic="Subtraction"
        onContinue={goToNextPlanet}
      />
    );
  }

  const renderStep = () => {
    if (step >= coreSteps - 1 && step < totalSteps - 1) {
      return <LessonDrill planet="saturn" index={step - (coreSteps - 1)} onReady={setDrillReady} />;
    }
    switch (step) {
      case 0:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-8">{tx('ui:s_eff938b9b0')}</h2>
            
            <div className="bg-card rounded-xl p-10 border border-border mb-8 w-full max-w-md">
              <div className="flex justify-center items-end gap-3 mb-6 min-h-[120px]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i}>
                    <Pencil className="pointer-events-none" size="lg" />
                  </div>
                ))}
                {!hidePencils && animationPhase !== 'final' && (
                  <>
                    <div className={hidePencils ? 'animate-pencil-disappear' : ''}>
                      <Pencil className="pointer-events-none" size="lg" />
                    </div>
                    <div className={hidePencils ? 'animate-pencil-disappear' : ''}>
                      <Pencil className="pointer-events-none" size="lg" />
                    </div>
                  </>
                )}
                {animationPhase === 'animating' && (
                  <div className="flex gap-3 animate-pencil-disappear">
                    <Pencil className="pointer-events-none opacity-50" size="lg" />
                    <Pencil className="pointer-events-none opacity-50" size="lg" />
                  </div>
                )}
              </div>
              <Counter count={displayCount} />
              
              {animationPhase === 'final' && (
                <p className="mt-6 text-muted-foreground text-lg animate-fade-in">
                  5 - 2 = 3 left!
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
              <h2 className="text-3xl font-semibold text-foreground">{tx('ui:s_1fb209cef8')}</h2>
              <ReadAloudButton text={tx('ui:s_82a2705c39')} />
            </div>
            <p className="text-lg text-muted-foreground mb-10">{tx('ui:s_4037095c80')}</p>
            
            <div className="bg-card rounded-xl p-6 sm:p-10 border border-border mb-8 w-full max-w-lg">
              {/* Left side always shows all start pencils (taken ones fade in place);
                  taken pencils show up grayed on the right of the minus sign. */}
              <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                <div className="flex flex-wrap justify-center gap-2 min-w-[8rem] max-w-[12rem] sm:max-w-none">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const taken = i >= leftPencils;
                    return (
                      <Pencil
                        key={i}
                        onClick={!taken ? removePencil : undefined}
                        className={taken ? 'pointer-events-none opacity-25 grayscale' : ''}
                      />
                    );
                  })}
                </div>
                
                <span className="text-5xl font-bold text-saturn">−</span>
                
                <div className="flex gap-2 min-w-[100px] justify-center flex-wrap opacity-40 grayscale">
                  {Array.from({ length: removedPencils }).map((_, i) => (
                    <div key={i} className="animate-pencil-appear">
                      <Pencil className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8">
                <Counter count={leftPencils} label={tx('ui:leftLabel')} />
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground">
              Started: 6, Took: {removedPencils}, Left: {leftPencils}
            </p>
          </div>
        );

      case 2:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-3xl font-semibold text-foreground">
                Leave {activity2Target} Pencils
              </h2>
              <ReadAloudButton text={`Take away until you have ${activity2Target} pencils. You start with ${activity2Start}.`} />
            </div>
            <p className="text-lg text-muted-foreground mb-8">
              Take away until you have {activity2Target}
            </p>
            
            <div className="flex justify-center gap-8 mb-8">
              <Counter count={activity2Pencils} label={tx('ui:youHave')} />
              <Counter count={activity2Target} label={tx('ui:youNeed')} />
            </div>
            
            <div className="bg-card rounded-xl p-6 sm:p-10 border border-border mb-8 w-full max-w-lg">
              {/* Left side always shows the full starting group of 7 so the picture
                  keeps matching "7 − 3"; taken pencils gray out on the right. */}
              <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                <div className="flex flex-wrap justify-center gap-2 min-w-[8rem] max-w-[12rem] sm:max-w-none">
                  {Array.from({ length: activity2Start }).map((_, i) => {
                    const taken = i >= activity2Pencils;
                    return (
                      <Pencil
                        key={i}
                        onClick={
                          !(activity2Checked && activity2Pencils === activity2Target) && !taken
                            ? removePencilActivity2
                            : undefined
                        }
                        className={
                          taken
                            ? 'pointer-events-none opacity-25 grayscale'
                            : activity2Checked && activity2Pencils === activity2Target
                              ? 'pointer-events-none'
                              : ''
                        }
                      />
                    );
                  })}
                </div>
                
                <span className="text-5xl font-bold text-saturn">−</span>
                
                <div className="flex gap-2 min-w-[100px] justify-center flex-wrap opacity-40 grayscale">
                  {Array.from({ length: activity2Removed }).map((_, i) => (
                    <div key={i} className="animate-pencil-appear">
                      <Pencil className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {!activity2Checked && (
              <Button onClick={checkActivity2} size="lg">{tx('ui:s_4b5e84be0e')}</Button>
            )}
            
            {activity2Checked && !showGuided && (
              <div className="flex flex-col items-center gap-4">
                <div className={`flex items-center gap-2 ${
                  activity2Pencils === activity2Target ? 'text-success' : 'text-destructive'
                }`}>
                  {activity2Pencils === activity2Target ? (
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
                {activity2Pencils !== activity2Target && (
                  <Button onClick={resetActivity2} variant="outline" size="lg">{tx('ui:s_cef2fe093b')}</Button>
                )}
                {diagnosis && <ThoughtCard diagnosis={diagnosis} />}
              </div>
            )}

            {showGuided && (
              <GuidedPractice
                lessonType="subtraction"
                num1={activity2Start}
                num2={activity2Start - activity2Target}
                storyHint="Take pencils away one at a time."
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
            <h2 className="text-3xl font-semibold text-foreground mb-4">{tx('ui:s_580c2752f5')}</h2>
            <p className="text-xl text-muted-foreground mb-10">{tx('ui:s_c920893e44')}</p>
            
            <div className="mb-10 w-full px-2">
              <LessonCelebration lessonType="subtraction" />
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <PracticeAgainButton onClick={practiceAgain} />
              <Button onClick={() => setShowTransition(true)} size="lg">{tx('ui:s_29d554030f')}</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <LessonShell
      planet="saturn"
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

export default SubtractionSaturn;
