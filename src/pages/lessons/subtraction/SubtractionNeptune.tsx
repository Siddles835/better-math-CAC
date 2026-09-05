// Subtraction Lesson - Neptune (Quiz)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useLessonStep } from '@/hooks/useLessonStep';
import StoryQuiz from '@/components/StoryQuiz';
import QuizResults from '@/components/QuizResults';
import LessonShell from '@/components/LessonShell';
import ReadAloudButton from '@/components/ReadAloudButton';
import GuidedPractice from '@/components/GuidedPractice';
import { Button } from '@/components/ui/button';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { diagnoseFromQuiz } from '@/lib/cognition';

const SubtractionNeptune: React.FC = () => {
  const navigate = useNavigate();
  const { completePlanet, saveLastQuiz, saveDiagnosis } = useGame();
  const [step, setStep] = useLessonStep('neptune');
  
  // MCQ state
  const [mcqA] = useState(Math.floor(Math.random() * 4) + 5);
  const [mcqB] = useState(Math.floor(Math.random() * 3) + 1);
  const mcqAnswer = mcqA - mcqB;
  const [mcqOptions] = useState(() => {
    const opts = [mcqAnswer];
    while (opts.length < 4) {
      const opt = Math.floor(Math.random() * 8) + 1;
      if (!opts.includes(opt) && opt >= 0) opts.push(opt);
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
      hapticError();
      setWrongAttempts((prev) => prev + 1);
      setShowGuided(true);
    } else {
      hapticSuccess();
    }
  };
  
  const handleQuizComplete = (score: number, areas: string[], tries: number[]) => {
    setQuizScore(score);
    setQuizAreas(areas);
    setQuizTries(tries);
    void saveLastQuiz({
      planet: 'neptune',
      lesson: 'subtraction',
      score,
      total: 8,
      tries,
    });
    void saveDiagnosis(diagnoseFromQuiz('neptune', score, 8, tries));
    setStep(2);
  };

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
                What is <span className="font-bold text-neptune">{mcqA}</span> − <span className="font-bold text-neptune">{mcqB}</span>?
              </p>
              <ReadAloudButton text={`What is ${mcqA} minus ${mcqB}?`} />
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
                lessonType="subtraction"
                num1={mcqA}
                num2={mcqB}
                storyHint={`What is ${mcqA} minus ${mcqB}?`}
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
              Zara's School Day
            </h2>
            <p className="text-muted-foreground mb-8 text-center">
              Help Zara share school supplies!
            </p>
            <StoryQuiz 
              lessonType="subtraction" 
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
            lessonType="subtraction"
            onFinish={() => {
              void completePlanet('neptune');
              navigate('/planets');
            }}
            onBack={() => {
              void completePlanet('neptune');
              navigate('/planets');
            }}
            finishLabel="Return to Planets"
          />
        );

      default:
        return null;
    }
  };

  return (
    <LessonShell
      planet="neptune"
      totalSteps={totalSteps}
      step={step}
      onBack={step > 0 ? () => setStep(step - 1) : () => navigate('/planets')}
      showNext={false}
    >
      {renderStep()}
    </LessonShell>
  );
};

export default SubtractionNeptune;
