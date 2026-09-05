import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Star,
  Rocket,
  Apple,
  Shirt,
  Circle,
  Gauge,
  AppWindow,
  type LucideIcon,
} from 'lucide-react';
import GuidedPractice from '@/components/GuidedPractice';
import NumberPad from '@/components/NumberPad';
import ReadAloudButton from '@/components/ReadAloudButton';
import { hapticError, hapticSuccess, hapticTap } from '@/lib/haptics';

interface Question {
  story: string;
  question: string;
  options: number[];
  answer: number;
  num1?: number;
  num2?: number;
  /** Icon shown for counting questions so the picture matches the prompt. */
  icon?: LucideIcon;
  /** Whether the icon should be filled (looks nicer for stars/buttons). */
  iconFill?: boolean;
  /** Extra classes for the counting picture (e.g. blue buttons). */
  iconClass?: string;
}

interface StoryQuizProps {
  lessonType: 'counting' | 'addition' | 'subtraction';
  onComplete: (score: number, areas: string[], questionTries: number[]) => void;
}

const countingQuestions: Question[] = [
  {
    story: 'Luna is going to space! She packs her bag.',
    question: 'How many stars does Luna pack?',
    options: [4, 5, 6, 3],
    answer: 5,
    num1: 5,
    icon: Star,
    iconFill: true,
  },
  {
    story: 'Luna looks at her food.',
    question: 'How many apples are ready for the trip?',
    options: [6, 7, 8, 5],
    answer: 7,
    num1: 7,
    icon: Apple,
  },
  {
    story: 'She gets her suits.',
    question: 'How many space suits does Luna have?',
    options: [2, 3, 4, 1],
    answer: 3,
    num1: 3,
    icon: Shirt,
  },
  {
    story: 'Luna sees buttons on the control panel.',
    question: 'How many blue buttons does she see?',
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 6,
    icon: Circle,
    iconFill: true,
    iconClass: 'bg-sky-500/30 text-sky-400',
  },
  {
    story: 'She checks the power meters.',
    question: 'How many power meters are lit?',
    options: [3, 4, 5, 2],
    answer: 4,
    num1: 4,
    icon: Gauge,
  },
  {
    story: 'Luna counts windows on the ship.',
    question: 'How many windows does Luna count?',
    options: [7, 8, 9, 6],
    answer: 8,
    num1: 8,
    icon: AppWindow,
  },
  {
    story: 'Time to go! She sees stars outside.',
    question: 'How many bright stars does she see?',
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 6,
    icon: Star,
    iconFill: true,
  },
  {
    story: 'Luna made it! She is happy.',
    question: 'How many toy rockets does Luna have?',
    options: [1, 2, 3, 4],
    answer: 2,
    num1: 2,
    icon: Rocket,
  },
];

const additionQuestions: Question[] = [
  {
    story: "Max likes to paint. He has brushes.",
    question: "Max has 2 brushes. He gets 3 more. How many now?",
    options: [4, 5, 6, 3],
    answer: 5,
    num1: 2,
    num2: 3
  },
  {
    story: "Max has paint jars.",
    question: "He has 3 red and 2 blue. How many in all?",
    options: [4, 5, 6, 3],
    answer: 5,
    num1: 3,
    num2: 2
  },
  {
    story: "He looks at his papers.",
    question: "2 big papers and 4 small papers. How many?",
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 2,
    num2: 4
  },
  {
    story: "Friends come to paint!",
    question: "4 kids here. 2 more come. How many kids?",
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 4,
    num2: 2
  },
  {
    story: "Time for a snack!",
    question: "Max has 3 grapes. He gets 4 more. How many?",
    options: [6, 7, 8, 5],
    answer: 7,
    num1: 3,
    num2: 4
  },
  {
    story: "Max finds rocks.",
    question: "He has 1 rock. He finds 5 more. How many?",
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 1,
    num2: 5
  },
  {
    story: "He draws with crayons.",
    question: "2 crayons here and 2 more there. How many?",
    options: [3, 4, 5, 2],
    answer: 4,
    num1: 2,
    num2: 2
  },
  {
    story: "Max is done! He made art.",
    question: "He made 3 drawings today and 3 yesterday. How many?",
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 3,
    num2: 3
  }
];

const subtractionQuestions: Question[] = [
  {
    story: "Zara has pencils for class.",
    question: "She has 5 pencils. She gives 2 away. How many left?",
    options: [2, 3, 4, 1],
    answer: 3,
    num1: 5,
    num2: 2
  },
  {
    story: "The kids need erasers.",
    question: "There are 6 erasers. 2 kids take one each. How many left?",
    options: [3, 4, 5, 2],
    answer: 4,
    num1: 6,
    num2: 2
  },
  {
    story: "Lunch time! Cookies for all.",
    question: "There are 7 cookies. 3 get eaten. How many left?",
    options: [3, 4, 5, 2],
    answer: 4,
    num1: 7,
    num2: 3
  },
  {
    story: "Books on the shelf.",
    question: "6 books are here. 1 is taken. How many now?",
    options: [4, 5, 6, 3],
    answer: 5,
    num1: 6,
    num2: 1
  },
  {
    story: "Zara has stickers.",
    question: "She has 8 stickers. She gives 4 away. How many left?",
    options: [3, 4, 5, 2],
    answer: 4,
    num1: 8,
    num2: 4
  },
  {
    story: "Apples in a bowl.",
    question: "5 apples. 2 are eaten. How many left?",
    options: [2, 3, 4, 1],
    answer: 3,
    num1: 5,
    num2: 2
  },
  {
    story: "Kids go home.",
    question: "7 kids were here. 2 left. How many still here?",
    options: [4, 5, 6, 3],
    answer: 5,
    num1: 7,
    num2: 2
  },
  {
    story: "Good day at school!",
    question: "9 crayons. 3 are lost. How many left?",
    options: [5, 6, 7, 4],
    answer: 6,
    num1: 9,
    num2: 3
  }
];

const affirmations = [
  "That's right.",
  "Yes.",
  "Good.",
  "Correct.",
];

interface EquationChip {
  id: number;
  value: number;
}

/** Build tappable number chips: the two problem numbers plus two distractors. */
const buildEquationChips = (question: Question): EquationChip[] => {
  const values = [question.num1!, question.num2!];
  const candidates = [
    question.answer,
    question.num1! + 1,
    question.num2! + 2,
    9, 8, 1, 7,
  ];
  for (const candidate of candidates) {
    if (values.length >= 4) break;
    if (candidate >= 0 && candidate <= 9 && !values.includes(candidate)) {
      values.push(candidate);
    }
  }
  const chips = values.map((value, id) => ({ id, value }));
  // Fisher–Yates shuffle
  for (let i = chips.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chips[i], chips[j]] = [chips[j], chips[i]];
  }
  return chips;
};

const StoryQuiz: React.FC<StoryQuizProps> = ({ lessonType, onComplete }) => {
  const questions = lessonType === 'counting' 
    ? countingQuestions 
    : lessonType === 'addition' 
    ? additionQuestions 
    : subtractionQuestions;

  const needsEquation = lessonType !== 'counting';
  const operator = lessonType === 'subtraction' ? '−' : '+';

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [stars, setStars] = useState<boolean[]>(Array(8).fill(false));
  const [wrongTopics, setWrongTopics] = useState<string[]>([]);
  const [showAffirmation, setShowAffirmation] = useState(false);
  const [currentAffirmation, setCurrentAffirmation] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [questionTries, setQuestionTries] = useState<number[]>(() => Array(8).fill(0));
  const [showGuidedPractice, setShowGuidedPractice] = useState(false);
  const [showRocketLaunch, setShowRocketLaunch] = useState(false);

  // Equation-building stage (addition/subtraction only)
  const [stage, setStage] = useState<'equation' | 'solve'>(needsEquation ? 'equation' : 'solve');
  const [slots, setSlots] = useState<(number | null)[]>([null, null]);
  const [equationChecked, setEquationChecked] = useState(false);
  const [equationCorrect, setEquationCorrect] = useState(false);
  const [equationAttempts, setEquationAttempts] = useState(0);

  const question = questions[currentQuestion];
  const actionsRef = useRef<HTMLDivElement>(null);

  // Questions 3 and 6 (0-based indexes 2 and 5) are open-ended typed answers.
  const isOpenEnded = currentQuestion % 3 === 2;

  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    },
    []
  );

  const chips = useMemo(
    () => (needsEquation ? buildEquationChips(question) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentQuestion, needsEquation]
  );

  const chipValue = (chipId: number | null) =>
    chipId === null ? null : chips.find(c => c.id === chipId)?.value ?? null;

  const placeChip = (chip: EquationChip) => {
    if (equationChecked && equationCorrect) return;
    if (slots.includes(chip.id)) return;
    const emptyIndex = slots.indexOf(null);
    if (emptyIndex === -1) return;
    hapticTap();
    setSlots(prev => prev.map((s, i) => (i === emptyIndex ? chip.id : s)));
    setEquationChecked(false);
  };

  const clearSlot = (index: number) => {
    if (equationChecked && equationCorrect) return;
    setSlots(prev => prev.map((s, i) => (i === index ? null : s)));
    setEquationChecked(false);
  };

  const checkEquation = () => {
    const v1 = chipValue(slots[0]);
    const v2 = chipValue(slots[1]);
    if (v1 === null || v2 === null) return;
    const correct =
      lessonType === 'addition'
        ? (v1 === question.num1 && v2 === question.num2) ||
          (v1 === question.num2 && v2 === question.num1)
        : v1 === question.num1 && v2 === question.num2;
    setEquationChecked(true);
    setEquationCorrect(correct);
    if (correct) {
      hapticSuccess();
    }
    if (!correct) {
      hapticError();
      setEquationAttempts((prev) => prev + 1);
      if (!wrongTopics.includes(lessonType)) {
        setWrongTopics((prev) => [...prev, lessonType]);
      }
    }
  };

  const retryEquation = () => {
    setSlots([null, null]);
    setEquationChecked(false);
    setEquationCorrect(false);
  };

  const effectiveAnswer = isOpenEnded
    ? (typedAnswer === '' ? null : parseInt(typedAnswer, 10))
    : selectedAnswer;

  useEffect(() => {
    const shouldReveal =
      isChecked ||
      equationChecked ||
      showAffirmation ||
      (stage === 'solve' && effectiveAnswer !== null);
    if (!shouldReveal) return;
    actionsRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [isChecked, equationChecked, stage, currentQuestion, showAffirmation, effectiveAnswer]);

  const checkAnswer = () => {
    setIsChecked(true);
    const isAnswerCorrect = effectiveAnswer === question.answer;

    if (isAnswerCorrect) {
      hapticSuccess();
      // Award star even if they got it right on retry
      const newStars = [...stars];
      newStars[currentQuestion] = true;
      setStars(newStars);
      setCurrentAffirmation(affirmations[currentQuestion % affirmations.length]);
      setShowAffirmation(true);
    } else {
      hapticError();
      // Only first wrong solve attempt counts toward "areas to practice"
      if (wrongAttempts === 0 && !wrongTopics.includes(lessonType)) {
        setWrongTopics((prev) => [...prev, lessonType]);
      }
      setWrongAttempts((prev) => prev + 1);
      setShowGuidedPractice(true);
    }
  };

  const handleGuidedPracticeClose = () => {
    setShowGuidedPractice(false);
    // Clear the attempt so the student can pick/type again and tap Check
    setSelectedAnswer(null);
    setTypedAnswer('');
    setIsChecked(false);
  };

  const triesForCurrent = () => 1 + wrongAttempts + equationAttempts;

  const nextQuestion = () => {
    setShowAffirmation(false);
    const triesThis = triesForCurrent();
    const allTries = questionTries.map((t, i) => (i === currentQuestion ? triesThis : t));
    setQuestionTries(allTries);
    setWrongAttempts(0);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setTypedAnswer('');
      setIsChecked(false);
      setStage(needsEquation ? 'equation' : 'solve');
      setSlots([null, null]);
      setEquationChecked(false);
      setEquationCorrect(false);
      setEquationAttempts(0);
    } else {
      const finalStars = [...stars];
      if (effectiveAnswer === question.answer) {
        finalStars[currentQuestion] = true;
      }
      const score = finalStars.filter(Boolean).length;
      const areas = allTries.some((t) => t > 1) ? [lessonType] : [...wrongTopics];
      setShowRocketLaunch(true);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      finishTimerRef.current = setTimeout(() => {
        onComplete(score, areas, allTries);
      }, 3000);
    }
  };

  const isCorrect = effectiveAnswer === question.answer;

  const starsEarned = stars.filter(Boolean).length;
  const progressPercent = (starsEarned / 8) * 100;

  // Full-screen rocket launch animation
  if (showRocketLaunch) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center animate-fade-in subtle-stars">
        <p className="text-3xl font-bold text-foreground mb-8 animate-fade-in">
          {starsEarned === 8 ? 'All stars earned!' : `${starsEarned} stars earned!`}
        </p>
        <div className="relative w-40 h-40 animate-rocket-launch-screen">
          <Rocket className="w-40 h-40 text-primary rotate-[-90deg]" />
          {/* Flame effect */}
          <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-12 h-20 bg-gradient-to-t from-transparent via-accent/80 to-destructive/60 rounded-full blur-md animate-pulse" />
        </div>
      </div>
    );
  }

  const CountIcon = question.icon ?? Star;
  const countingStars = lessonType === 'counting' && question.num1 ? (
    <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-xs mx-auto">
      {Array.from({ length: question.num1 }).map((_, i) => (
        <span
          key={i}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
            question.iconClass ?? 'bg-primary/25 text-primary'
          }`}
        >
          <CountIcon className={`h-4 w-4 ${question.iconFill ? 'fill-current' : ''}`} />
        </span>
      ))}
    </div>
  ) : null;

  const renderEquationStage = () => (
    <div className="bg-card rounded-xl p-6 border border-border mb-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full inline-block">
          Step 1: Build the equation
        </span>
        <ReadAloudButton text={question.question} />
      </div>

      <p className="text-xl text-foreground mb-4">
        {question.question}
      </p>

      <p className="text-sm text-muted-foreground mb-6">
        Use the numbers from the story to set up the problem!
      </p>

      {/* Equation slots */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {slots.map((chipId, i) => (
          <React.Fragment key={i}>
            {i === 1 && <span className="text-3xl font-bold text-primary">{operator}</span>}
            <button
              type="button"
              onClick={() => clearSlot(i)}
              disabled={chipId === null}
              aria-label={chipId === null ? 'Empty number slot' : `Slot with ${chipValue(chipId)} - tap to remove`}
              className={`w-16 h-16 rounded-xl text-3xl font-bold flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                chipId !== null
                  ? 'bg-primary text-primary-foreground hover:bg-primary/80 active:scale-95 animate-count-pop'
                  : 'border-2 border-dashed border-muted-foreground/50 text-muted-foreground'
              }`}
            >
              {chipId !== null ? chipValue(chipId) : '_'}
            </button>
          </React.Fragment>
        ))}
        <span className="text-3xl font-bold text-muted-foreground">=</span>
        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-muted-foreground/50 text-3xl font-bold flex items-center justify-center text-muted-foreground">
          ?
        </div>
      </div>

      {/* Number chips */}
      <div className="flex justify-center gap-3 flex-wrap mb-6">
        {chips.map(chip => {
          const used = slots.includes(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => placeChip(chip)}
              disabled={used || (equationChecked && equationCorrect)}
              className={`w-14 h-14 rounded-xl text-2xl font-bold border flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                used
                  ? 'opacity-30 border-border bg-muted text-muted-foreground'
                  : 'border-border bg-card text-foreground hover:border-primary hover:scale-110 active:scale-95'
              }`}
            >
              {chip.value}
            </button>
          );
        })}
      </div>

      {/* Equation feedback */}
      {equationChecked && equationCorrect && (
        <div ref={actionsRef} className="text-center animate-fade-in space-y-4 relative z-20">
          <p className="text-xl font-semibold text-success">
            You built the equation! {chipValue(slots[0])} {operator} {chipValue(slots[1])} = ?
          </p>
          <Button type="button" onClick={() => setStage('solve')} size="lg" className="min-h-[48px] relative z-20">
            Now Solve It
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      )}

      {equationChecked && !equationCorrect && (
        <div ref={actionsRef} className="text-center animate-fade-in space-y-4 relative z-20">
          <p className="text-lg text-destructive font-semibold">
            Not quite! Look at the story again.
          </p>
          {equationAttempts >= 2 && (
            <p className="text-muted-foreground">
              Hint: the story says <span className="font-bold text-primary">{question.num1} {operator} {question.num2}</span>
            </p>
          )}
          <Button type="button" onClick={retryEquation} variant="outline" size="lg" className="min-h-[48px] relative z-20">
            Try Again
          </Button>
        </div>
      )}

      {!equationChecked && (
        <div ref={actionsRef} className="text-center relative z-20">
          <Button
            type="button"
            onClick={checkEquation}
            size="lg"
            disabled={slots.some(s => s === null)}
            className="min-h-[48px] relative z-20"
          >
            Check Equation
          </Button>
        </div>
      )}
    </div>
  );

  const renderSolveStage = () => (
    <div className="animate-fade-in">
      {/* Question */}
      <div className="bg-card rounded-xl p-6 border border-border mb-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full inline-block">
            {needsEquation ? 'Step 2: Solve it' : `${currentQuestion + 1} of ${questions.length}`}
          </span>
          <ReadAloudButton text={question.question} />
        </div>
        
        {needsEquation && (
          <p className="text-3xl font-bold text-primary text-center mb-6">
            {question.num1} {operator} {question.num2} = ?
          </p>
        )}

        <p className="text-xl text-foreground mb-4">{question.question}</p>

        {countingStars}

        {/* Answer input: number pad for open-ended, buttons otherwise */}
        {isOpenEnded ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Type your answer!
            </p>
            <NumberPad
              value={typedAnswer}
              onChange={setTypedAnswer}
              disabled={isChecked}
              maxLength={1}
            />
            {isChecked && (
              <p className={`text-center mt-4 text-xl font-semibold ${isCorrect ? 'text-success' : 'text-destructive'}`}>
                {isCorrect ? 'Correct!' : 'Not quite!'}
              </p>
            )}
          </div>
        ) : (
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
                className={`text-2xl py-7 transition-all duration-300 active:scale-95 ${
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
        )}
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
      {wrongAttempts >= 2 && !showGuidedPractice && !(isChecked && isCorrect) && (
        <div className="text-center mb-5 animate-fade-in">
          <p className="text-lg text-muted-foreground">
            The answer is <span className="font-bold text-success">{question.answer}</span>
          </p>
        </div>
      )}

      {/* Actions */}
      <div ref={actionsRef} className="flex flex-col items-center gap-3 relative z-20 py-2">
        {!isChecked && !showGuidedPractice && wrongAttempts > 0 && effectiveAnswer === null && (
          <p className="text-sm text-muted-foreground text-center">
            Pick or type an answer, then tap Check to try again.
          </p>
        )}
        <div className="flex justify-center gap-4">
          {!isChecked && effectiveAnswer !== null && (
            <Button type="button" onClick={checkAnswer} size="lg" className="min-h-[48px] relative z-20">
              Check
            </Button>
          )}

          {isChecked && isCorrect && (
            <Button type="button" onClick={nextQuestion} size="lg" className="min-h-[48px] relative z-20">
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
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-xl mx-auto animate-fade-in pb-6">
      {/* Progress Bar - Far Right Edge (decorative, must not intercept clicks) */}
      <div className="fixed right-1 top-20 bottom-24 w-6 sm:w-8 flex flex-col items-center z-10 pointer-events-none">
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

      <div key={currentQuestion} className="animate-fade-in">
        {/* Story text */}
        <div className="bg-card/50 rounded-xl p-5 mb-5 border border-border">
          <div className="flex items-start justify-between gap-3">
            <p className="text-lg text-foreground leading-relaxed flex-1">
              {question.story}
            </p>
            <ReadAloudButton text={question.story} className="shrink-0" />
          </div>
        </div>

        {stage === 'equation' ? renderEquationStage() : renderSolveStage()}
      </div>

      {/* Interactive guided practice overlay */}
      {showGuidedPractice && (
        <GuidedPractice
          lessonType={lessonType}
          num1={question.num1 || question.answer}
          num2={question.num2}
          storyHint={`${question.story} ${question.question}`}
          onClose={handleGuidedPracticeClose}
        />
      )}
    </div>
  );
};

export default StoryQuiz;
