import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Target, AlertCircle, ChevronRight } from 'lucide-react';

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  areasToImprove: string[];
  lessonType: 'counting' | 'addition' | 'subtraction';
  videoUrl: string;
  onFinish: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({
  score,
  totalQuestions,
  areasToImprove,
  lessonType,
  videoUrl,
  onFinish
}) => {
  const [showResults, setShowResults] = useState(false);
  
  const percentage = Math.round((score / totalQuestions) * 100);
  
  const getPerformanceMessage = () => {
    if (percentage >= 90) return "Outstanding! You're a star!";
    if (percentage >= 70) return "Great job! Keep practicing!";
    if (percentage >= 50) return "Good effort! You're learning!";
    return "Keep trying! Practice makes perfect!";
  };

  const getTopicLabel = (topic: string) => {
    switch (topic) {
      case 'counting': return 'Counting objects accurately';
      case 'adding': return 'Adding numbers together';
      case 'subtracting': return 'Subtracting to find the difference';
      default: return topic;
    }
  };

  return (
    <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
      <h2 className="text-3xl font-semibold text-foreground mb-4">
        Congratulations!
      </h2>
      <p className="text-xl text-muted-foreground mb-10">
        You completed the {lessonType} quiz! Watch this celebration video:
      </p>
      
      <div className="bg-card rounded-xl p-10 border border-border max-w-xl mx-auto mb-10">
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <iframe
            width="100%"
            height="100%"
            src={videoUrl}
            title="Celebration Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="rounded-lg"
          />
        </div>
      </div>

      {/* Results Modal Button */}
      <div className="fixed bottom-8 right-8">
        <Button 
          onClick={() => setShowResults(true)}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <Trophy className="w-5 h-5" />
          View My Score
        </Button>
      </div>

      {/* Results Modal */}
      {showResults && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border max-w-lg w-full p-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                Your Quiz Results
              </h3>
              <p className="text-muted-foreground">
                {getPerformanceMessage()}
              </p>
            </div>

            {/* Score */}
            <div className="bg-muted/50 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-center gap-4">
                <Target className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="text-3xl font-bold text-foreground">
                    {score} / {totalQuestions}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {percentage}% correct
                  </p>
                </div>
              </div>
            </div>

            {/* Areas to Improve */}
            {areasToImprove.length > 0 && (
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

            {areasToImprove.length === 0 && (
              <div className="mb-6 bg-success/10 rounded-xl p-4">
                <p className="text-success font-medium">
                  🎉 Perfect score! No areas need improvement!
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                onClick={() => setShowResults(false)} 
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
              <Button 
                onClick={onFinish}
                className="flex-1"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Button onClick={onFinish} size="lg">
        Return to Planets
      </Button>
    </div>
  );
};

export default QuizResults;
