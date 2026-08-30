// Addition Lesson - Jupiter (Quiz)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useLessonStep } from '@/hooks/useLessonStep';
import StoryQuiz from '@/components/StoryQuiz';
import QuizResults from '@/components/QuizResults';
import LessonShell from '@/components/LessonShell';
import PlanetTransition from '@/components/PlanetTransition';
import ReadAloudButton from '@/components/ReadAloudButton';
import GuidedPractice from '@/components/GuidedPractice';
import { Button } from '@/components/ui/button';
import {
  getNextPlanet,
  getLessonRoute,
  PLANET_META,
  PLANET_BG_CLASS,
  getTopicDisplayName,
} from '@/lib/planets';

const AdditionJupiter: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition, completePlanet, saveLastQuiz } = useGame();
  const [step, setStep] = useLessonStep('jupiter');
  const [showTransition, setShowTransition] = useState(false);
  const nextPlanet = getNextPlanet('jupiter');
  
  // MCQ state
  const [mcqA] = useState(Math.floor(Math.random() * 4) + 1);
  const [mcqB] = useState(Math.floor(Math.random() * 4) + 1);
  const mcqAnswer = mcqA + mcqB;
  const [mcqOptions] = useState(() => {
    const opts = [mcqAnswer];
    while (opts.length < 4) {
      const opt = Math.floor(Math.random() * 8) + 1;
      if (!opts.includes(opt)) opts.push(opt);
    }
    return opts.sort(() => Math.random() - 0.5);
  });
  const [mcqSelected, setMcqSelected] = useState<number | null>(null);
  const [mcqChecked, setMcqChecked] = useState(false);
  const [showGuided, setShowGuided] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  
  // Quiz results state
  const [quizScore, setQuizScore] = useState(0);
  const [quizAreas, setQuizAreas] = useState<string[]>([]);
  const [quizTries, setQuizTries] = useState<number[]>([]);

  const totalSteps = 3;

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
    setStep(2);
  };

  const goToNextPlanet = () => {
    if (!nextPlanet) return;
    completePlanet('jupiter');
    setShowRocketTransition(true);
    setTimeout(() => {
      navigate(getLessonRoute(nextPlanet), { state: { initialStep: 0 } });
      setShowRocketTransition(false);
    }, 1600);
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
    switch (step) {
      case 0:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Quick Quiz!
            </h2>
            <div className="flex items-center justify-center gap-3 mb-10">
              <p className="text-2xl text-foreground">
                What is <span className="font-bold text-jupiter">{mcqA}</span> + <span className="font-bold text-jupiter">{mcqB}</span>?
              </p>
              <ReadAloudButton text={`What is ${mcqA} plus ${mcqB}?`} />
            </div>
            
            <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto mb-10">
              {mcqOptions.map((option) => (
                <Button
                  key={option}
                  onClick={() => !mcqChecked && setMcqSelected(option)}
                  variant={
                    mcqChecked
                      ? option === mcqAnswer
                        ? 'default'
                        : option === mcqSelected
                        ? 'destructive'
                        : 'outline'
                      : mcqSelected === option
                      ? 'default'
                      : 'outline'
                  }
                  className={`text-2xl py-8 transition-all duration-500 ${
                    mcqChecked && option === mcqAnswer
                      ? 'bg-success hover:bg-success'
                      : ''
                  }`}
                  disabled={mcqChecked}
                >
                  {option}
                </Button>
              ))}
            </div>
            
            {!mcqChecked && mcqSelected !== null && (
              <Button onClick={checkMcq} size="lg">
                Check
              </Button>
            )}
            
            {mcqChecked && !showGuided && (
              <div className="space-y-4">
                <p className={`text-xl font-semibold ${
                  mcqSelected === mcqAnswer ? 'text-success' : 'text-destructive'
                }`}>
                  {mcqSelected === mcqAnswer
                    ? 'Great!'
                    : wrongAttempts >= 2
                      ? `The answer is ${mcqAnswer}`
                      : "Let's practice with pencils!"}
                </p>
                {mcqSelected !== mcqAnswer ? (
                  <Button variant="outline" size="lg" onClick={resetMcq}>
                    Try Again
                  </Button>
                ) : (
                  <Button size="lg" onClick={() => setStep(1)}>
                    Start Story Quiz
                  </Button>
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

      case 1:
        return (
          <div className="flex flex-col items-center justify-center flex-1 py-8">
            <h2 className="text-3xl font-semibold text-foreground mb-4 text-center">
              Max's Art Day
            </h2>
            <p className="text-muted-foreground mb-8 text-center">
              Help Max add his art supplies!
            </p>
            <StoryQuiz 
              lessonType="addition" 
              onComplete={handleQuizComplete}
            />
          </div>
        );

      case 2:
        return (
          <QuizResults
            score={quizScore}
            totalQuestions={8}
            areasToImprove={quizAreas}
            questionTries={quizTries}
            lessonType="addition"
            onFinish={() => setShowTransition(true)}
            onBack={() => {
              void completePlanet('jupiter');
              navigate('/planets');
            }}
            finishLabel={nextPlanet ? `Go to ${PLANET_META[nextPlanet].name}` : 'Continue'}
          />
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
      showNext={false}
    >
      {renderStep()}
    </LessonShell>
  );
};

export default AdditionJupiter;
