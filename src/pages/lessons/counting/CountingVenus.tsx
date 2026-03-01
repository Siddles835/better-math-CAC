// Counting Lesson - Venus (Quiz)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import StoryQuiz from '@/components/StoryQuiz';
import QuizResults from '@/components/QuizResults';
import HomeButton from '@/components/HomeButton';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

const CountingVenus: React.FC = () => {
  const navigate = useNavigate();
  const { completePlanet } = useGame();
  const [step, setStep] = useState(0);
  
  // MCQ state
  const [mcqQuestion] = useState(() => {
    const count = Math.floor(Math.random() * 6) + 2;
    const options = [count];
    while (options.length < 4) {
      const opt = Math.floor(Math.random() * 8) + 1;
      if (!options.includes(opt)) options.push(opt);
    }
    return { count, options: options.sort(() => Math.random() - 0.5) };
  });
  const [mcqAnswer, setMcqAnswer] = useState<number | null>(null);
  const [mcqChecked, setMcqChecked] = useState(false);
  
  // Quiz results state
  const [quizScore, setQuizScore] = useState(0);
  const [quizAreas, setQuizAreas] = useState<string[]>([]);

  const totalSteps = 3;

  const checkMcq = (answer: number) => {
    setMcqAnswer(answer);
    setMcqChecked(true);
  };
  
  const resetMcq = () => {
    setMcqAnswer(null);
    setMcqChecked(false);
  };
  
  const handleQuizComplete = (score: number, areas: string[]) => {
    setQuizScore(score);
    setQuizAreas(areas);
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
            <p className="text-xl text-muted-foreground mb-10">
              How many circles?
            </p>
            
            <div className="flex justify-center gap-4 mb-10 flex-wrap max-w-sm mx-auto">
              {Array.from({ length: mcqQuestion.count }).map((_, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-primary" />
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto">
              {mcqQuestion.options.map((option) => (
                <Button
                  key={option}
                  onClick={() => !mcqChecked && checkMcq(option)}
                  variant={
                    mcqChecked
                      ? option === mcqQuestion.count
                        ? 'default'
                        : option === mcqAnswer
                        ? 'destructive'
                        : 'outline'
                      : 'outline'
                  }
                  className={`text-2xl py-8 transition-all duration-500 ${
                    mcqChecked && option === mcqQuestion.count
                      ? 'bg-success hover:bg-success'
                      : ''
                  }`}
                  disabled={mcqChecked}
                >
                  {option}
                </Button>
              ))}
            </div>
            
            {mcqChecked && (
              <div className="mt-8 space-y-4">
                <p className={`text-xl font-semibold ${
                  mcqAnswer === mcqQuestion.count ? 'text-success' : 'text-destructive'
                }`}>
                  {mcqAnswer === mcqQuestion.count ? 'Great!' : `The answer is ${mcqQuestion.count}`}
                </p>
                {mcqAnswer !== mcqQuestion.count ? (
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
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col items-center justify-center flex-1 py-8">
            <h2 className="text-3xl font-semibold text-foreground mb-4 text-center">
              Luna's Space Trip
            </h2>
            <p className="text-muted-foreground mb-8 text-center">
              Help Luna count things for her trip!
            </p>
            <StoryQuiz 
              lessonType="counting" 
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
            lessonType="counting"
            videoUrl="https://www.youtube.com/embed/D0Ajq682yrA"
            onFinish={() => {
              completePlanet('venus');
              navigate('/solar-system');
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col p-4 md:p-8">
      <HomeButton />
      
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i === step ? 'bg-venus' : i < step ? 'bg-venus/50' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto">
        {renderStep()}
      </div>
    </div>
  );
};

export default CountingVenus;
