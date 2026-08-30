import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Target, AlertCircle, ChevronRight } from 'lucide-react';
import LessonCelebration from '@/components/LessonCelebration';

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  areasToImprove: string[];
  lessonType: 'counting' | 'addition' | 'subtraction';
  onFinish: () => void;
  finishLabel?: string;
  onBack?: () => void;
  /** Attempts per question (1 = first try). Extra tries are shown to teachers. */
  questionTries?: number[];
}

const QuizResults: React.FC<QuizResultsProps> = ({
  score,
  totalQuestions,
  areasToImprove,
  lessonType,
  onFinish,
  finishLabel = 'Continue',
  onBack,
  questionTries,
}) => {
  const [showResults, setShowResults] = useState(false);

  const percentage = Math.round((score / totalQuestions) * 100);
  const extraTryCount = (questionTries ?? []).filter((t) => t > 1).length;
  const perfectFirstTry = percentage === 100 && extraTryCount === 0;

  const getPerformanceMessage = () => {
    if (percentage >= 90) return "Outstanding! You're a star!";
    if (percentage >= 70) return 'Great job! Keep practicing!';
    if (percentage >= 50) return "Good effort! You're learning!";
    return 'Keep trying! Practice makes perfect!';
  };

  const getTopicLabel = (topic: string) => {
    switch (topic) {
      case 'counting':
        return 'Counting objects accurately';
      case 'adding':
      case 'addition':
        return 'Adding numbers together';
      case 'subtracting':
      case 'subtraction':
        return 'Subtracting to find the difference';
      default:
        return topic;
    }
  };

  return (
    <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1 py-4">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground mb-3 sm:mb-4 px-2">Congratulations!</h2>
      <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-8 px-2">
        You completed the {lessonType} quiz!
      </p>

      <div className="mb-6 sm:mb-8 w-full px-2">
        <LessonCelebration lessonType={lessonType} />
      </div>

      <div className="flex flex-col items-stretch gap-3 w-full max-w-xs mx-auto">
        <Button
          type="button"
          onClick={() => setShowResults(true)}
          variant="outline"
          size="lg"
          className="gap-2 min-h-[48px] cursor-pointer touch-manipulation"
        >
          <Trophy className="w-5 h-5" />
          View My Score
        </Button>
        <Button
          type="button"
          onClick={onFinish}
          size="lg"
          className="min-h-[48px] cursor-pointer touch-manipulation"
        >
          {finishLabel}
        </Button>
        {onBack && (
          <Button
            type="button"
            onClick={onBack}
            size="lg"
            variant="outline"
            className="min-h-[48px] cursor-pointer touch-manipulation"
          >
            Finish &amp; Return to Planets
          </Button>
        )}
      </div>

      {showResults && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border max-w-lg w-full p-8 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">Your Quiz Results</h3>
              <p className="text-muted-foreground">{getPerformanceMessage()}</p>
            </div>

            <div className="bg-muted/50 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-center gap-4">
                <Target className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="text-3xl font-bold text-foreground">
                    {score} / {totalQuestions}
                  </p>
                  <p className="text-sm text-muted-foreground">{percentage}% correct</p>
                </div>
              </div>
            </div>

            {perfectFirstTry && (
              <div className="mb-6 bg-success/10 rounded-xl p-4">
                <p className="text-success font-medium">Perfect score! No areas need improvement.</p>
              </div>
            )}

            {percentage === 100 && extraTryCount > 0 && (
              <div className="mb-6 bg-accent/10 rounded-xl p-4">
                <p className="text-foreground font-medium">
                  You got every question! Some took more than one try.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your teacher can see which questions needed extra practice.
                </p>
              </div>
            )}

            {percentage < 100 && areasToImprove.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-accent" />
                  <h4 className="font-medium text-foreground">Areas to Practice</h4>
                </div>
                <ul className="space-y-2">
                  {areasToImprove.map((topic, i) => (
                    <li
                      key={i}
                      className="bg-accent/10 text-accent-foreground px-4 py-2 rounded-lg text-sm"
                    >
                      {getTopicLabel(topic)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {percentage < 100 && areasToImprove.length === 0 && extraTryCount > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-accent" />
                  <h4 className="font-medium text-foreground">Areas to Practice</h4>
                </div>
                <p className="bg-accent/10 text-accent-foreground px-4 py-2 rounded-lg text-sm">
                  {getTopicLabel(lessonType)}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" onClick={() => setShowResults(false)} variant="outline" className="flex-1 min-h-[48px]">
                Close
              </Button>
              <Button type="button" onClick={onFinish} className="flex-1 min-h-[48px]">
                {finishLabel}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizResults;
