// Addition Lesson - Jupiter (Quiz)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StoryQuiz from '@/components/StoryQuiz';
import QuizResults from '@/components/QuizResults';
import HomeButton from '@/components/HomeButton';
import { Button } from '@/components/ui/button';

const AdditionJupiter: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  
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
  
  // Quiz results state
  const [quizScore, setQuizScore] = useState(0);
  const [quizAreas, setQuizAreas] = useState<string[]>([]);

  const totalSteps = 3;

  const resetMcq = () => {
    setMcqSelected(null);
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
            <p className="text-2xl text-foreground mb-10">
              What is <span className="font-bold text-jupiter">{mcqA}</span> + <span className="font-bold text-jupiter">{mcqB}</span>?
            </p>
            
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
              <Button onClick={() => setMcqChecked(true)} size="lg">
                Check
              </Button>
            )}
            
            {mcqChecked && (
              <div className="space-y-4">
                <p className={`text-xl font-semibold ${
                  mcqSelected === mcqAnswer ? 'text-success' : 'text-destructive'
                }`}>
                  {mcqSelected === mcqAnswer ? 'Great!' : `The answer is ${mcqAnswer}`}
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
            lessonType="addition"
            videoUrl="https://www.youtube.com/embed/75NQK-Sm1YY"
            onFinish={() => navigate('/planets')}
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
              i === step ? 'bg-jupiter' : i < step ? 'bg-jupiter/50' : 'bg-muted'
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

export default AdditionJupiter;
