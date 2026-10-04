import { saveDiagnosisSafely } from '@/lib/saveDiagnosisSafely';
import LessonDrill from '@/components/LessonDrill';
import { insertedCount } from '@/lib/lessonDuration';
import { tx } from '@/i18n/tx';
// Addition Lesson - Jupiter (Quiz)
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
import { generateJupiterMcq } from '@/lib/answers';

const AdditionJupiter: React.FC = () => {
  const navigate = useNavigate();
  const { saveLastQuiz, saveDiagnosis } = useGame();
  const { leave, finish } = usePlanetHandoff();
  const [step, setStep] = useLessonStep('jupiter');
  const [showTransition, setShowTransition] = useState(false);
  const nextPlanet = getNextPlanet('jupiter');
  
  // MCQ state — derived answer + Fisher–Yates options (never biased sort).
  const [mcq] = useState(() => generateJupiterMcq((Math.random() * 1e9) | 0));
  const mcqA = mcq.operands[0];
  const mcqB = mcq.operands[1];
  const mcqAnswer = mcq.expectedAnswer;
  const mcqOptions = mcq.options;
  const [mcqSelected, setMcqSelected] = useState<number | null>(null);
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

  const resetMcq = () => {
    setMcqSelected(null);
    setMcqChecked(false);
    setShowGuided(false);
  };

  const checkMcq = () => {
    setMcqChecked(true);
    if (mcqSelected !== mcqAnswer) {
      setWrongAttempts((prev) => prev + 1);
      setShowGuided(true);
    }
  };
  
  const handleQuizComplete = (score: number, areas: string[], tries: number[]) => {
    setQuizScore(score);
    setQuizAreas(areas);
    setQuizTries(tries);
    void saveLastQuiz({
      planet: 'jupiter',
      lesson: 'addition',
      score,
      total: 8,
      tries,
    });
    saveDiagnosisSafely(saveDiagnosis, diagnoseFromQuiz('jupiter', score, 8, tries));
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
    leave('jupiter', getLessonRoute(nextPlanet), { initialStep: 0 });
  };

  if (showTransition && nextPlanet) {
    return (
      <PlanetTransition
        currentPlanet={PLANET_META.jupiter.name}
        nextPlanet={PLANET_META[nextPlanet].name}
        currentPlanetColor={PLANET_BG_CLASS.jupiter}
        nextPlanetColor={PLANET_BG_CLASS[nextPlanet]}
        topic={getTopicDisplayName('jupiter')}
        onContinue={goToNextPlanet}
      />
    );
  }

  const renderStep = () => {
    if (step >= 1 && step < 1 + insertedCount) {
      return <LessonDrill planet="jupiter" index={step - 1} onReady={setDrillReady} />;
    }
    switch (step) {
      case 0:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">{tx('ui:s_2e2e808a99')}</h2>
            <div className="flex items-center justify-center gap-3 mb-10">
              <p className="text-2xl text-foreground">{tx('ui:s_9c9e11934c')}<span className="font-bold text-jupiter">{mcqA}</span> + <span className="font-bold text-jupiter">{mcqB}</span>?
              </p>
              <ReadAloudButton text={`What is ${mcqA} plus ${mcqB}?`} />
            </div>
            
            <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto mb-10">
              {mcqOptions.map((option) => (
                <Button
                  key={option}
                  onClick={() => {
                    if (mcqChecked && mcqSelected === mcqAnswer) return;
                    setMcqSelected(option);
                    if (mcqChecked) setMcqChecked(false);
                  }}
                  variant={
                    mcqChecked
                      ? mcqSelected === mcqAnswer && option === mcqAnswer
                        ? 'default'
                        : option === mcqSelected
                        ? 'destructive'
                        : 'outline'
                      : mcqSelected === option
                      ? 'default'
                      : 'outline'
                  }
                  className={`text-2xl py-8 transition-all duration-500 ${
                    mcqChecked && mcqSelected === mcqAnswer && option === mcqAnswer
                      ? 'bg-success hover:bg-success'
                      : ''
                  }`}
                  disabled={mcqChecked && mcqSelected === mcqAnswer}
                >
                  {option}
                </Button>
              ))}
            </div>
            
            {!mcqChecked && mcqSelected !== null && (
              <Button onClick={checkMcq} size="lg">{tx('ui:s_4b5e84be0e')}</Button>
            )}
            
            {mcqChecked && !showGuided && (
              <div className="space-y-4">
                <p className={`text-xl font-semibold ${
                  mcqSelected === mcqAnswer ? 'text-success' : 'text-destructive'
                }`}>
                  {mcqSelected === mcqAnswer
                    ? 'Great!'
                    : 'Try adding one more group in your head, then pick again'}
                </p>
                {mcqSelected !== mcqAnswer ? (
                  <Button variant="outline" size="lg" onClick={resetMcq}>{tx('ui:s_cef2fe093b')}</Button>
                ) : (
                  <Button size="lg" onClick={() => setStep(1)}>{tx('ui:s_5617eba9f8')}</Button>
                )}
              </div>
            )}

            {showGuided && (
              <GuidedPractice
                lessonType="addition"
                num1={mcqA}
                num2={mcqB}
                storyHint={`What is ${mcqA} plus ${mcqB}?`}
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
            <h2 className="text-3xl font-semibold text-foreground mb-4 text-center">
              Max's Art Day
            </h2>
            <p className="text-muted-foreground mb-8 text-center">{tx('ui:s_2d9ad2ce13')}</p>
            <StoryQuiz
              key={quizEpoch}
              lessonType="addition"
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
            lessonType="addition"
            onFinish={() => setShowTransition(true)}
            onBack={() => finish('jupiter')}
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
      planet="jupiter"
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

export default AdditionJupiter;
