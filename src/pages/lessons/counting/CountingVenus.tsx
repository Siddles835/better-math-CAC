import { saveDiagnosisSafely } from '@/lib/saveDiagnosisSafely';
import { tx } from '@/i18n/tx';
import LessonDrill from '@/components/LessonDrill';
import { insertedCount } from '@/lib/lessonDuration';
// Counting Lesson - Venus (Quiz)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useLessonStep } from '@/hooks/useLessonStep';
import { usePlanetHandoff } from '@/hooks/usePlanetHandoff';
import PracticeAgainButton from '@/components/PracticeAgainButton';
import StoryQuiz from '@/components/StoryQuiz';
import QuizResults from '@/components/QuizResults';
import LessonShell from '@/components/LessonShell';
import PlanetTransition from '@/components/PlanetTransition';
import ReadAloudButton from '@/components/ReadAloudButton';
import GuidedPractice from '@/components/GuidedPractice';
import { Button } from '@/components/ui/button';
import { diagnoseFromQuiz } from '@/lib/cognition';
import {
  getNextPlanet,
  getLessonRoute,
  PLANET_META,
  PLANET_BG_CLASS,
  getTopicDisplayName,
} from '@/lib/planets';
import { generateVenusMcq } from '@/lib/answers';

const CountingVenus: React.FC = () => {
  const navigate = useNavigate();
  const { saveLastQuiz, saveDiagnosis } = useGame();
  const { leave, finish } = usePlanetHandoff();
  const [step, setStep] = useLessonStep('venus');
  const [showTransition, setShowTransition] = useState(false);
  const nextPlanet = getNextPlanet('venus');
  
  // MCQ state — seeded generator guarantees unique options + answer present.
  const [mcqQuestion] = useState(() => {
    const q = generateVenusMcq((Math.random() * 1e9) | 0);
    return { count: q.expectedAnswer, options: q.options };
  });
  const [mcqAnswer, setMcqAnswer] = useState<number | null>(null);
  const [mcqChecked, setMcqChecked] = useState(false);
  const [showGuided, setShowGuided] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  
  // Quiz results state
  const [quizScore, setQuizScore] = useState(0);
  const [quizAreas, setQuizAreas] = useState<string[]>([]);
  const [quizTries, setQuizTries] = useState<number[]>([]);
  const [quizEpoch, setQuizEpoch] = useState(0);

  const [drillReady, setDrillReady] = useState(false);
  const totalSteps = 3 + insertedCount;

  const checkMcq = (answer: number) => {
    setMcqAnswer(answer);
    setMcqChecked(true);
    if (answer !== mcqQuestion.count) {
      setWrongAttempts((prev) => prev + 1);
      setShowGuided(true);
    }
  };
  
  const resetMcq = () => {
    setMcqAnswer(null);
    setMcqChecked(false);
    setShowGuided(false);
  };
  
  const handleQuizComplete = (score: number, areas: string[], tries: number[]) => {
    setQuizScore(score);
    setQuizAreas(areas);
    setQuizTries(tries);
    void saveLastQuiz({
      planet: 'venus',
      lesson: 'counting',
      score,
      total: 8,
      tries,
    });
    saveDiagnosisSafely(saveDiagnosis, diagnoseFromQuiz('venus', score, 8, tries));
    setStep(2 + insertedCount);
  };

  const practiceAgain = () => {
    setQuizScore(0);
    setQuizAreas([]);
    setQuizTries([]);
    setQuizEpoch((n) => n + 1);
    setStep(1 + insertedCount);
  };

  const goToNextPlanet = () => {
    if (!nextPlanet) return;
    leave('venus', getLessonRoute(nextPlanet), { initialStep: 0 });
  };

  if (showTransition && nextPlanet) {
    return (
      <PlanetTransition
        currentPlanet={PLANET_META.venus.name}
        nextPlanet={PLANET_META[nextPlanet].name}
        currentPlanetColor={PLANET_BG_CLASS.venus}
        nextPlanetColor={PLANET_BG_CLASS[nextPlanet]}
        topic={getTopicDisplayName('venus')}
        onContinue={goToNextPlanet}
      />
    );
  }

  const renderStep = () => {
    if (step >= 1 && step < 1 + insertedCount) {
      return <LessonDrill planet="venus" index={step - 1} onReady={setDrillReady} />;
    }
    switch (step) {
      case 0:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">{tx('ui:s_2e2e808a99')}</h2>
            <div className="flex items-center justify-center gap-3 mb-10">
              <p className="text-xl text-muted-foreground">{tx('ui:s_a297be8ee6')}</p>
              <ReadAloudButton text={tx('ui:s_a297be8ee6')} />
            </div>
            
            <div className="flex justify-center gap-4 mb-10 flex-wrap max-w-sm mx-auto">
              {Array.from({ length: mcqQuestion.count }).map((_, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-primary" />
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto">
              {mcqQuestion.options.map((option) => (
                <Button
                  key={option}
                  onClick={() => {
                    if (mcqChecked && mcqAnswer === mcqQuestion.count) return;
                    checkMcq(option);
                  }}
                  variant={
                    mcqChecked
                      ? mcqAnswer === mcqQuestion.count && option === mcqQuestion.count
                        ? 'default'
                        : option === mcqAnswer
                          ? 'destructive'
                          : 'outline'
                      : 'outline'
                  }
                  className={`text-2xl py-8 transition-all duration-500 ${
                    mcqChecked && mcqAnswer === mcqQuestion.count && option === mcqQuestion.count
                      ? 'bg-success hover:bg-success'
                      : ''
                  }`}
                  disabled={mcqChecked && mcqAnswer === mcqQuestion.count}
                >
                  {option}
                </Button>
              ))}
            </div>
            
            {mcqChecked && !showGuided && (
              <div className="mt-8 space-y-4">
                <p className={`text-xl font-semibold ${
                  mcqAnswer === mcqQuestion.count ? 'text-success' : 'text-destructive'
                }`}>
                  {mcqAnswer === mcqQuestion.count
                    ? 'Great!'
                    : 'Count them again, one at a time'}
                </p>
                {mcqAnswer !== mcqQuestion.count ? (
                  <Button variant="outline" size="lg" onClick={resetMcq}>{tx('ui:s_cef2fe093b')}</Button>
                ) : (
                  <Button size="lg" onClick={() => setStep(1)}>{tx('ui:s_5617eba9f8')}</Button>
                )}
              </div>
            )}

            {showGuided && (
              <GuidedPractice
                lessonType="counting"
                num1={mcqQuestion.count}
                storyHint="How many circles?"
                onClose={() => {
                  setShowGuided(false);
                  resetMcq();
                }}
              />
            )}
          </div>
        );

      case 1 + insertedCount:
        return (
          <div className="flex flex-col items-center justify-center flex-1 py-8">
            <h2 className="text-3xl font-semibold text-foreground mb-4 text-center">{tx('ui:s_8f931f6ef3')}</h2>
            <p className="text-muted-foreground mb-8 text-center">{tx('ui:s_e019eccc32')}</p>
            <StoryQuiz
              key={quizEpoch}
              lessonType="counting"
              onComplete={handleQuizComplete}
            />
          </div>
        );

      case 2 + insertedCount:
        return (
          <>
          <PracticeAgainButton onClick={practiceAgain} />
          <QuizResults
            score={quizScore}
            totalQuestions={8}
            areasToImprove={quizAreas}
            questionTries={quizTries}
            lessonType="counting"
            onFinish={() => setShowTransition(true)}
            onBack={() => finish('venus')}
            finishLabel={nextPlanet ? tx('ui:goToPlanet', { planet: tx(`ui:planet_${nextPlanet}`) }) : tx('ui:s_bc981983e7')}
          />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <LessonShell
      planet="venus"
      totalSteps={totalSteps}
      step={step}
      onBack={step > 0 ? () => setStep(step - 1) : () => navigate('/planets')}
      showNext={step >= 1 && step < 1 + insertedCount && drillReady}
      onNext={step >= 1 && step < 1 + insertedCount && drillReady ? () => setStep(step + 1) : undefined}
    >
      {renderStep()}
    </LessonShell>
  );
};

export default CountingVenus;
