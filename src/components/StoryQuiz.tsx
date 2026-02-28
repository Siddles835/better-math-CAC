import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Star, Pencil, Rocket } from 'lucide-react';

interface Question {
  story: string;
  question: string;
  options: number[];
  answer: number;
  num1?: number;
  num2?: number;
}

interface StoryQuizProps {
  lessonType: 'counting' | 'addition' | 'subtraction';
  onComplete: (score: number, areas: string[]) => void;
}

const countingQuestions: Question[] = [
  {
    story: "Luna is going to space! She packs her bag.",
    question: "Count the stars: ⭐⭐⭐⭐⭐ How many?",
    options: [4, 5, 6, 3],
    answer: 5,
    num1: 5
  },
  {
    story: "Luna looks at her food.",
    question: "Count: 🍎🍎🍎🍎🍎🍎🍎 How many apples?",
    options: [6, 7, 8, 5],
    answer: 7,
    num1: 7
  },
  {
    story: "She gets her suits.",
    question: "Count: 🧥🧥🧥 How many suits?",
    options: [2, 3, 4, 1],
    answer: 3,
    num1: 3
  },
  {
    story: "Luna sees buttons.",
    question: "Count: 🔴🔴🔴🔴🔴🔴 How many red dots?",
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 6
  },
  {
    story: "She checks the power.",
    question: "Count: ⚡⚡⚡⚡ How many?",
    options: [3, 4, 5, 2],
    answer: 4,
    num1: 4
  },
  {
    story: "Luna counts windows.",
    question: "Count: 🪟🪟🪟🪟🪟🪟🪟🪟 How many?",
    options: [7, 8, 9, 6],
    answer: 8,
    num1: 8
  },
  {
    story: "Time to go! She sees stars.",
    question: "Count: ✨✨✨✨✨✨ How many stars?",
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 6
  },
  {
    story: "Luna made it! She is happy.",
    question: "Count her toys: 🚀🚀 How many rockets?",
    options: [1, 2, 3, 4],
    answer: 2,
    num1: 2
  }
];

const additionQuestions: Question[] = [
  {
    story: "Max likes to paint. He has brushes.",
    question: "Max has 2 brushes. He gets 3 more. How many now? 2 + 3 = ?",
    options: [4, 5, 6, 3],
    answer: 5,
    num1: 2,
    num2: 3
  },
  {
    story: "Max has paint jars.",
    question: "He has 3 red and 2 blue. How many in all? 3 + 2 = ?",
    options: [4, 5, 6, 3],
    answer: 5,
    num1: 3,
    num2: 2
  },
  {
    story: "He looks at his papers.",
    question: "2 big papers and 4 small papers. How many? 2 + 4 = ?",
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 2,
    num2: 4
  },
  {
    story: "Friends come to paint!",
    question: "4 kids here. 2 more come. How many kids? 4 + 2 = ?",
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 4,
    num2: 2
  },
  {
    story: "Time for a snack!",
    question: "Max has 3 grapes. He gets 4 more. How many? 3 + 4 = ?",
    options: [6, 7, 8, 5],
    answer: 7,
    num1: 3,
    num2: 4
  },
  {
    story: "Max finds rocks.",
    question: "He has 1 rock. He finds 5 more. How many? 1 + 5 = ?",
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 1,
    num2: 5
  },
  {
    story: "He draws with crayons.",
    question: "2 crayons here and 2 more there. How many? 2 + 2 = ?",
    options: [3, 4, 5, 2],
    answer: 4,
    num1: 2,
    num2: 2
  },
  {
    story: "Max is done! He made art.",
    question: "He made 3 drawings today and 3 yesterday. How many? 3 + 3 = ?",
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 3,
    num2: 3
  }
];

const subtractionQuestions: Question[] = [
  {
    story: "Zara has pencils for class.",
    question: "She has 5 pencils. She gives 2 away. How many left? 5 - 2 = ?",
    options: [2, 3, 4, 1],
    answer: 3,
    num1: 5,
    num2: 2
  },
  {
    story: "The kids need erasers.",
    question: "There are 6 erasers. 2 kids take one each. How many left? 6 - 2 = ?",
    options: [3, 4, 5, 2],
    answer: 4,
    num1: 6,
    num2: 2
  },
  {
    story: "Lunch time! Cookies for all.",
    question: "There are 7 cookies. 3 get eaten. How many left? 7 - 3 = ?",
    options: [3, 4, 5, 2],
    answer: 4,
    num1: 7,
    num2: 3
  },
  {
    story: "Books on the shelf.",
    question: "6 books are here. 1 is taken. How many now? 6 - 1 = ?",
    options: [4, 5, 6, 3],
    answer: 5,
    num1: 6,
    num2: 1
  },
  {
    story: "Zara has stickers.",
    question: "She has 8 stickers. She gives 4 away. How many left? 8 - 4 = ?",
    options: [3, 4, 5, 2],
    answer: 4,
    num1: 8,
    num2: 4
  },
  {
    story: "Apples in a bowl.",
    question: "5 apples. 2 are eaten. How many left? 5 - 2 = ?",
    options: [2, 3, 4, 1],
    answer: 3,
    num1: 5,
    num2: 2
  },
  {
    story: "Kids go home.",
    question: "7 kids were here. 2 left. How many still here? 7 - 2 = ?",
    options: [4, 5, 6, 3],
    answer: 5,
    num1: 7,
    num2: 2
  },
  {
    story: "Good day at school!",
    question: "9 crayons. 3 are lost. How many left? 9 - 3 = ?",
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 9,
    num2: 3
  }
];

const affirmations = [
  "Great!",
  "Good job!",
  "Nice!",
  "Yes!",
  "Super!",
  "Wow!",
  "Yay!",
  "Perfect!"
];

// Pencil animation component for wrong answers
const PencilAnimation: React.FC<{
  lessonType: 'counting' | 'addition' | 'subtraction';
  num1: number;
  num2?: number;
  onClose: () => void;
}> = ({ lessonType, num1, num2 = 0, onClose }) => {
  const [phase, setPhase] = useState<'start' | 'action' | 'end'>('start');
  
  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('action'), 1000);
    const timer2 = setTimeout(() => setPhase('end'), 2000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (lessonType === 'counting') {
    return (
      <div className="fixed inset-0 bg-background/90 z-50 flex items-center justify-center animate-fade-in">
        <div className="bg-card rounded-2xl p-8 border border-border max-w-md text-center relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
          <p className="text-xl font-semibold mb-6 text-foreground">
            Let's count again!
          </p>
          <div className="flex gap-3 flex-wrap justify-center mb-4">
            {Array.from({ length: num1 }).map((_, i) => (
              <div 
                key={i}
                className="w-10 h-10 flex items-center justify-center animate-scale-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <Pencil className="w-8 h-8 text-primary" />
              </div>
            ))}
          </div>
          <p className="text-3xl font-bold text-primary">{num1} pencils</p>
        </div>
      </div>
    );
  }

  if (lessonType === 'addition') {
    return (
      <div className="fixed inset-0 bg-background/90 z-50 flex items-center justify-center animate-fade-in">
        <div className="bg-card rounded-2xl p-8 border border-border max-w-md text-center relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
          <p className="text-xl font-semibold mb-6 text-foreground">
            Watch how we add!
          </p>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex gap-1">
              {Array.from({ length: num1 }).map((_, i) => (
                <Pencil key={i} className="w-6 h-6 text-primary" />
              ))}
            </div>
            <span className="text-2xl font-bold text-primary">+</span>
            <div className={`flex gap-1 transition-all duration-1000 ${
              phase === 'start' ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
            }`}>
              {Array.from({ length: num2 }).map((_, i) => (
                <Pencil key={i} className="w-6 h-6 text-accent" />
              ))}
            </div>
          </div>
          <p className="text-3xl font-bold text-primary">
            {num1} + {num2} = {num1 + num2}
          </p>
        </div>
      </div>
    );
  }

  // Subtraction
  return (
    <div className="fixed inset-0 bg-background/90 z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-card rounded-2xl p-8 border border-border max-w-md text-center relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
        <p className="text-xl font-semibold mb-6 text-foreground">
          Watch how we subtract!
        </p>
        <div className="flex gap-2 flex-wrap justify-center mb-4">
          {Array.from({ length: num1 }).map((_, i) => (
            <Pencil 
              key={i} 
              className={`w-6 h-6 transition-all duration-1000 ${
                phase !== 'start' && i >= num1 - num2 
                  ? 'opacity-30 scale-75 line-through' 
                  : 'text-primary'
              }`}
            />
          ))}
        </div>
        <p className="text-3xl font-bold text-primary">
          {num1} - {num2} = {num1 - num2}
        </p>
      </div>
    </div>
  );
};

const StoryQuiz: React.FC<StoryQuizProps> = ({ lessonType, onComplete }) => {
  const questions = lessonType === 'counting' 
    ? countingQuestions 
    : lessonType === 'addition' 
    ? additionQuestions 
    : subtractionQuestions;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [stars, setStars] = useState<boolean[]>(Array(8).fill(false));
  const [wrongTopics, setWrongTopics] = useState<string[]>([]);
  const [showAffirmation, setShowAffirmation] = useState(false);
  const [currentAffirmation, setCurrentAffirmation] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showPencilAnimation, setShowPencilAnimation] = useState(false);
  const [showRocketLaunch, setShowRocketLaunch] = useState(false);

  const question = questions[currentQuestion];

  const checkAnswer = () => {
    setIsChecked(true);
    const isCorrect = selectedAnswer === question.answer;
    
    if (isCorrect) {
      // Award star even if they got it right on retry
      const newStars = [...stars];
      newStars[currentQuestion] = true;
      setStars(newStars);
      setCurrentAffirmation(affirmations[currentQuestion % affirmations.length]);
      setShowAffirmation(true);
    } else {
      if (!wrongTopics.includes(lessonType)) {
        setWrongTopics(prev => [...prev, lessonType]);
      }
      setWrongAttempts(prev => prev + 1);
      // Show pencil animation for wrong answer
      setShowPencilAnimation(true);
    }
  };

  const handlePencilAnimationClose = () => {
    setShowPencilAnimation(false);
  };

  const nextQuestion = () => {
    setShowAffirmation(false);
    setWrongAttempts(0);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setIsChecked(false);
    } else {
      const score = stars.filter(Boolean).length;
      // Show rocket launch animation before completing
      setShowRocketLaunch(true);
      setTimeout(() => {
        onComplete(score, wrongTopics);
      }, 3000);
    }
  };

  const retryQuestion = () => {
    setSelectedAnswer(null);
    setIsChecked(false);
  };

  const isCorrect = selectedAnswer === question.answer;

  const starsEarned = stars.filter(Boolean).length;
  const progressPercent = (starsEarned / 8) * 100;

  // Full-screen rocket launch animation
  if (showRocketLaunch) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center animate-fade-in subtle-stars">
        <p className="text-3xl font-bold text-foreground mb-8 animate-fade-in">All stars earned! 🌟</p>
        <div className="relative w-40 h-40 animate-rocket-launch-screen">
          <Rocket className="w-40 h-40 text-primary rotate-[-90deg]" />
          {/* Flame effect */}
          <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-12 h-20 bg-gradient-to-t from-transparent via-accent/80 to-destructive/60 rounded-full blur-md animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto animate-fade-in">
      {/* Progress Bar - Far Right Edge */}
      <div className="fixed right-0 top-16 bottom-16 w-8 flex flex-col items-center z-10">
        {/* Stars count */}
        <div className="flex flex-col items-center gap-0.5 mb-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-bold text-foreground">{starsEarned}/8</span>
        </div>
        
        {/* Vertical progress track */}
        <div className="relative flex-1 w-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="absolute bottom-0 w-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ height: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-6">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === currentQuestion 
                ? 'bg-primary' 
                : i < currentQuestion 
                ? 'bg-primary/50' 
                : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Story text */}
      <div className="bg-card/50 rounded-xl p-5 mb-5 border border-border">
        <p className="text-lg text-foreground leading-relaxed">
          {question.story}
        </p>
      </div>

      {/* Question */}
      <div className="bg-card rounded-xl p-6 border border-border mb-5">
        <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full mb-4 inline-block">
          {currentQuestion + 1} of {questions.length}
        </span>
        
        <p className="text-xl text-foreground mb-6">
          {question.question.split(/([\p{Emoji_Presentation}\p{Extended_Pictographic}]+)/gu).map((part, i) =>
            /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(part) ? (
              <span key={i} className="text-4xl leading-relaxed">{part}</span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((option) => (
            <Button
              key={option}
              onClick={() => !isChecked && setSelectedAnswer(option)}
              variant={
                isChecked
                  ? option === question.answer
                    ? 'default'
                    : option === selectedAnswer
                    ? 'destructive'
                    : 'outline'
                  : selectedAnswer === option
                  ? 'default'
                  : 'outline'
              }
              className={`text-2xl py-7 transition-all duration-300 ${
                isChecked && option === question.answer
                  ? 'bg-success hover:bg-success'
                  : ''
              }`}
              disabled={isChecked}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>

      {/* Affirmation */}
      {showAffirmation && (
        <div className="text-center mb-5 animate-fade-in">
          <p className="text-2xl font-semibold text-success">
            {currentAffirmation}
          </p>
        </div>
      )}

      {/* Feedback for wrong answer - only show correct answer on second wrong attempt */}
      {isChecked && !isCorrect && !showPencilAnimation && wrongAttempts >= 2 && (
        <div className="text-center mb-5 animate-fade-in">
          <p className="text-lg text-muted-foreground">
            The answer is <span className="font-bold text-success">{question.answer}</span>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4">
        {!isChecked && selectedAnswer !== null && (
          <Button onClick={checkAnswer} size="lg">
            Check
          </Button>
        )}
        
        {isChecked && !isCorrect && !showPencilAnimation && (
          <Button onClick={retryQuestion} variant="outline" size="lg">
            Try Again
          </Button>
        )}
        
        {isChecked && isCorrect && (
          <Button onClick={nextQuestion} size="lg">
            {currentQuestion < questions.length - 1 ? (
              <>
                Next
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            ) : (
              'Done'
            )}
          </Button>
        )}
      </div>

      {/* Pencil Animation Overlay */}
      {showPencilAnimation && (
        <PencilAnimation
          lessonType={lessonType}
          num1={question.num1 || question.answer}
          num2={question.num2}
          onClose={handlePencilAnimationClose}
        />
      )}
    </div>
  );
};

export default StoryQuiz;