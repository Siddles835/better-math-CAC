// Addition Lesson - Earth
// Activity / Practice + ML recommendation
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useLessonStep } from '@/hooks/useLessonStep';
import NavigationArrows from '@/components/NavigationArrows';
import Pencil from '@/components/Pencil';
import Counter from '@/components/Counter';
import PlanetTransition from '@/components/PlanetTransition';
import HomeButton from '@/components/HomeButton';
import { Button } from '@/components/ui/button';
import {
  Check,
  X,
  Play,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import {
  createFeatures,
} from '@/lib/recommendation/features';
import {
  predictRecommendation,
} from '@/lib/recommendation/model';

type Recommendation =
  | 'review'
  | 'practice'
  | 'advance'
  | 'challenge'
  | null;

const AdditionEarth: React.FC = () => {
  const navigate = useNavigate();

  const {
    setShowRocketTransition,
    completePlanet,
  } = useGame();

  const [step, setStep] = useLessonStep('earth');
  const [showTransition, setShowTransition] = useState(false);

  // ------------------------------------------------------------
  // ML recommendation
  // ------------------------------------------------------------

  const [recommendation, setRecommendation] =
    useState<Recommendation>(null);

  // ------------------------------------------------------------
  // Animation state
  // ------------------------------------------------------------

  const [animationPhase, setAnimationPhase] = useState<
    'idle' | 'initial' | 'animating' | 'final'
  >('idle');

  const [displayCount, setDisplayCount] = useState(3);
  const [showNewPencils, setShowNewPencils] = useState(false);

  // ------------------------------------------------------------
  // Activity 1
  // ------------------------------------------------------------

  const [leftPencils] = useState(3);
  const [rightPencils, setRightPencils] = useState(0);
  const [availablePencils, setAvailablePencils] = useState(5);

  // ------------------------------------------------------------
  // Activity 2
  // ------------------------------------------------------------

  const [activity2Left] = useState(2);
  const [activity2Right, setActivity2Right] = useState(0);
  const [activity2Available, setActivity2Available] = useState(6);
  const [activity2Target] = useState(6);

  const [activity2Checked, setActivity2Checked] =
    useState(false);

  const [activity2Correct, setActivity2Correct] =
    useState<boolean | null>(null);

  // Number of incorrect attempts on this activity.
  const [activity2Retries, setActivity2Retries] = useState(0);

  // Which targeted practice question we're showing.
  const [practiceRound, setPracticeRound] = useState(0);

  const totalSteps = 4;

  // ------------------------------------------------------------
  // Animation
  // ------------------------------------------------------------

  const startAnimation = () => {
    setAnimationPhase('initial');
    setDisplayCount(3);
    setShowNewPencils(false);

    setTimeout(() => {
      setAnimationPhase('animating');
      setShowNewPencils(true);
    }, 1000);

    setTimeout(() => {
      setDisplayCount(5);
    }, 2000);

    setTimeout(() => {
      setAnimationPhase('final');
    }, 3000);
  };

  // ------------------------------------------------------------
  // Activity 1
  // ------------------------------------------------------------

  const addPencilRight = () => {
    if (
      availablePencils > 0 &&
      leftPencils + rightPencils < 9
    ) {
      setRightPencils((prev) => prev + 1);
      setAvailablePencils((prev) => prev - 1);
    }
  };

  // ------------------------------------------------------------
  // Activity 2
  // ------------------------------------------------------------

  const addPencilActivity2 = () => {
    if (
      activity2Available > 0 &&
      !activity2Checked &&
      activity2Left + activity2Right < 9
    ) {
      setActivity2Right((prev) => prev + 1);
      setActivity2Available((prev) => prev - 1);
    }
  };

  /**
   * Clicking one of the student's added pencils removes it.
   *
   * This means a student who accidentally adds too many can
   * correct their answer instead of being forced to restart.
   */
  const removePencilActivity2 = () => {
    if (
      activity2Right > 0 &&
      !activity2Checked
    ) {
      setActivity2Right((prev) => prev - 1);
      setActivity2Available((prev) => prev + 1);
    }
  };

  // ------------------------------------------------------------
  // Check Activity 2
  // ------------------------------------------------------------

  const checkActivity2 = () => {
    const total =
      activity2Left + activity2Right;

    const isCorrect =
      total === activity2Target;

    const isTooMany =
      total > activity2Target;

    console.log('✅ Check button clicked');

    console.log('Activity 2:', {
      left: activity2Left,
      right: activity2Right,
      total,
      target: activity2Target,
      correct: isCorrect,
      tooMany: isTooMany,
      retries: activity2Retries,
    });

    setActivity2Correct(isCorrect);
    setActivity2Checked(true);

    // ----------------------------------------------------------
    // ML recommendation
    // ----------------------------------------------------------

    try {
      const totalAnswers = 1;
      const correctAnswers = isCorrect ? 1 : 0;

      const features = createFeatures({
        planet: 4,
        lessonDifficulty: 4,
        correctAnswers,
        totalAnswers,
        totalTimeSeconds: 5,
        hints: 0,
        retries: activity2Retries,
        improvement: isCorrect ? 100 : 0,
        consistency: isCorrect ? 100 : 0,
        streak: isCorrect ? 1 : 0,
      });

      const result = predictRecommendation(features);

      console.log('🤖 ML Recommendation:', result);
      console.log('🤖 ML Features:', features);

      setRecommendation(result);
    } catch (error) {
      console.error(
        '❌ ML recommendation failed:',
        error
      );

      setRecommendation(null);
    }
  };

  // ------------------------------------------------------------
  // Targeted practice
  // ------------------------------------------------------------

  /**
   * Instead of simply repeating the same question, an incorrect
   * answer moves the student into another practice round.
   *
   * For now the practice changes the target so the student sees
   * a fresh problem. This gives us a framework we can expand
   * with more generated questions later.
   */
  const startTargetedPractice = () => {
    console.log(
      '📚 Starting targeted practice round:',
      practiceRound + 1
    );

    setPracticeRound((prev) => prev + 1);

    setActivity2Right(0);
    setActivity2Available(6);
    setActivity2Checked(false);
    setActivity2Correct(null);

    setRecommendation(null);

    setActivity2Retries((prev) => prev + 1);
  };

  // ------------------------------------------------------------
  // Reset Activity 2
  // ------------------------------------------------------------

  const resetActivity2 = () => {
    setActivity2Right(0);
    setActivity2Available(6);
    setActivity2Checked(false);
    setActivity2Correct(null);
    setRecommendation(null);
  };

  // ------------------------------------------------------------
  // Move to Mars
  // ------------------------------------------------------------

  const goToNextPlanet = () => {
    completePlanet('earth');
    setShowRocketTransition(true);

    setTimeout(() => {
      navigate('/lesson/addition/mars');
    }, 2500);
  };

  // ------------------------------------------------------------
  // Transition
  // ------------------------------------------------------------

  if (showTransition) {
    return (
      <PlanetTransition
        currentPlanet="Earth"
        nextPlanet="Mars"
        currentPlanetColor="bg-earth"
        nextPlanetColor="bg-mars"
        topic="Addition"
        onContinue={goToNextPlanet}
      />
    );
  }

  // ------------------------------------------------------------
  // Feedback helpers
  // ------------------------------------------------------------

  const activity2Total =
    activity2Left + activity2Right;

  const activity2Difference =
    activity2Total - activity2Target;

  const renderActivityFeedback = () => {
    if (!activity2Checked) {
      return null;
    }

    // Correct
    if (activity2Correct) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-success">
            <Check className="w-8 h-8" />

            <span className="text-xl font-semibold">
              Great job!
            </span>
          </div>

          <p className="text-muted-foreground">
            You made exactly {activity2Target} pencils.
          </p>

          {recommendation && (
            <div className="bg-card rounded-xl p-5 border border-border max-w-xl">
              <p className="text-lg font-semibold">
                {recommendation === 'advance' &&
                  "You're ready for Mars! 🚀"}

                {recommendation === 'challenge' &&
                  "Amazing work! You're ready for a challenge on Mars! 🚀"}

                {recommendation === 'practice' &&
                  "Nice work! A little more practice will help you get even stronger."}

                {recommendation === 'review' &&
                  "Let's review this skill a little more before moving on."}
              </p>
            </div>
          )}

          <Button
            type="button"
            onClick={() => setStep(3)}
            size="lg"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            Continue
          </Button>
        </div>
      );
    }

    // Too many
    if (activity2Difference > 0) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-destructive">
            <X className="w-8 h-8" />

            <span className="text-xl font-semibold">
              That's a little too many.
            </span>
          </div>

          <p className="text-muted-foreground">
            You have {activity2Difference} too many
            {' '}
            {activity2Difference === 1
              ? 'pencil'
              : 'pencils'}.
          </p>

          <p className="text-muted-foreground">
            Click one of your added pencils to remove it.
          </p>

          <Button
            type="button"
            onClick={resetActivity2}
            variant="outline"
            size="lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Adjust My Answer
          </Button>

          <Button
            type="button"
            onClick={startTargetedPractice}
            variant="ghost"
            size="lg"
          >
            Try a Different Problem
          </Button>
        </div>
      );
    }

    // Too few
    const needed =
      activity2Target - activity2Total;

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-destructive">
          <X className="w-8 h-8" />

          <span className="text-xl font-semibold">
            Not quite yet.
          </span>
        </div>

        <p className="text-muted-foreground">
          You need {needed}{' '}
          {needed === 1 ? 'more pencil' : 'more pencils'}.
        </p>

        <Button
          type="button"
          onClick={resetActivity2}
          variant="outline"
          size="lg"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Adjust My Answer
        </Button>

        <Button
          type="button"
          onClick={startTargetedPractice}
          variant="ghost"
          size="lg"
        >
          Try a Different Problem
        </Button>
      </div>
    );
  };

  // ------------------------------------------------------------
  // Lesson steps
  // ------------------------------------------------------------

  const renderStep = () => {
    switch (step) {
      // ========================================================
      // STEP 0
      // ========================================================

      case 0:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-8">
              Watch: Adding Pencils
            </h2>

            <div className="bg-card rounded-xl p-10 border border-border mb-8 min-w-[400px]">
              <div className="flex justify-center items-end gap-3 mb-6 min-h-[120px]">
                {Array.from({ length: 3 }).map(
                  (_, i) => (
                    <div key={i}>
                      <Pencil
                        className="pointer-events-none"
                        size="lg"
                      />
                    </div>
                  )
                )}

                {showNewPencils && (
                  <>
                    <div className="animate-pencil-appear">
                      <Pencil
                        className="pointer-events-none"
                        size="lg"
                      />
                    </div>

                    <div
                      className="animate-pencil-appear"
                      style={{
                        animationDelay: '0.3s',
                      }}
                    >
                      <Pencil
                        className="pointer-events-none"
                        size="lg"
                      />
                    </div>
                  </>
                )}
              </div>

              <Counter count={displayCount} />

              {animationPhase === 'final' && (
                <p className="mt-6 text-muted-foreground text-lg animate-fade-in">
                  3 + 2 = 5 pencils!
                </p>
              )}
            </div>

            <div className="flex justify-center gap-4">
              {animationPhase === 'idle' && (
                <Button
                  type="button"
                  onClick={startAnimation}
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Watch
                </Button>
              )}

              {animationPhase === 'final' && (
                <Button
                  type="button"
                  onClick={startAnimation}
                  variant="outline"
                  size="lg"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Watch Again
                </Button>
              )}
            </div>
          </div>
        );

      // ========================================================
      // STEP 1
      // ========================================================

      case 1:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-6">
              Add Pencils
            </h2>

            <p className="text-lg text-muted-foreground mb-10">
              Click pencils to add them
            </p>

            <div className="bg-card rounded-xl p-10 border border-border mb-8">
              <div className="flex items-center justify-center gap-12">
                <div className="flex gap-2">
                  {Array.from({
                    length: leftPencils,
                  }).map((_, i) => (
                    <Pencil
                      key={i}
                      className="pointer-events-none"
                    />
                  ))}
                </div>

                <span className="text-5xl font-bold text-earth">
                  +
                </span>

                <div className="flex gap-2 min-w-[120px] justify-center">
                  {Array.from({
                    length: rightPencils,
                  }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pencil-appear"
                    >
                      <Pencil
                        className="pointer-events-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <Counter
                  count={
                    leftPencils + rightPencils
                  }
                  label="Total"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto">
              {Array.from({
                length: availablePencils,
              }).map((_, i) => (
                <Pencil
                  key={i}
                  onClick={addPencilRight}
                />
              ))}
            </div>
          </div>
        );

      // ========================================================
      // STEP 2
      // ========================================================

      case 2:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Make {activity2Target} Pencils
            </h2>

            <p className="text-lg text-muted-foreground mb-8">
              Add until you have exactly{' '}
              {activity2Target}.
            </p>

            <div className="flex justify-center gap-8 mb-8">
              <Counter
                count={activity2Total}
                label="You have"
              />

              <Counter
                count={activity2Target}
                label="You need"
              />
            </div>

            <div className="bg-card rounded-xl p-10 border border-border mb-8">
              <div className="flex items-center justify-center gap-12">
                <div className="flex gap-2">
                  {Array.from({
                    length: activity2Left,
                  }).map((_, i) => (
                    <Pencil
                      key={i}
                      className="pointer-events-none"
                    />
                  ))}
                </div>

                <span className="text-5xl font-bold text-earth">
                  +
                </span>

                <div className="flex gap-2 min-w-[120px] justify-center">
                  {Array.from({
                    length: activity2Right,
                  }).map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={
                        activity2Checked
                          ? undefined
                          : removePencilActivity2
                      }
                      className="cursor-pointer rounded-lg p-1 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Remove pencil"
                    >
                      <Pencil
                        className="pointer-events-none"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!activity2Checked && (
              <>
                <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto mb-8">
                  {Array.from({
                    length: activity2Available,
                  }).map((_, i) => (
                    <Pencil
                      key={i}
                      onClick={addPencilActivity2}
                    />
                  ))}
                </div>

                <Button
                  type="button"
                  onClick={checkActivity2}
                  size="lg"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Check
                </Button>
              </>
            )}

            {renderActivityFeedback()}
          </div>
        );

      // ========================================================
      // STEP 3
      // ========================================================

      case 3:
        return (
          <div className="text-center animate-fade-in flex flex-col items-center justify-center flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Great Work on Earth!
            </h2>

            <p className="text-xl text-muted-foreground mb-10">
              You learned how to add. Watch this video:
            </p>

            <div className="bg-card rounded-xl p-10 border border-border max-w-xl mx-auto mb-10">
              <div className="aspect-video bg-muted rounded-lg">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/G8hLQFpq0rU?si=BcyEG-LomVzdDWL_"
                  title="Addition Song"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                />
              </div>
            </div>

            {recommendation && (
              <div className="bg-card rounded-xl p-6 border border-border max-w-xl mx-auto mb-6">
                <p className="text-xl font-semibold">
                  {recommendation === 'review' &&
                    "Let's review this a little more before moving on."}

                  {recommendation === 'practice' &&
                    "You're doing well! A little more practice will help."}

                  {recommendation === 'advance' &&
                    "Great job! You're ready for Mars! 🚀"}

                  {recommendation === 'challenge' &&
                    "Wow! You're doing amazing! Ready for a challenge on Mars? 🚀"}
                </p>
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              {recommendation === 'review' && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setStep(2);
                    setRecommendation(null);
                    setActivity2Checked(false);
                    setActivity2Correct(null);
                  }}
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Practice Again
                </Button>
              )}

              {recommendation === 'practice' && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setStep(2);
                    setRecommendation(null);
                    setActivity2Checked(false);
                    setActivity2Correct(null);
                  }}
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  More Practice
                </Button>
              )}

              {(recommendation === 'advance' ||
                recommendation === 'challenge' ||
                recommendation === null) && (
                <Button
                  type="button"
                  onClick={() =>
                    setShowTransition(true)
                  }
                  size="lg"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Go to Mars
                </Button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ------------------------------------------------------------
  // Page layout
  // ------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background subtle-stars flex flex-col p-4 md:p-8">
      <HomeButton />

      <div className="flex justify-center gap-2 mb-6">
        {Array.from({
          length: totalSteps,
        }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i === step
                ? 'bg-earth'
                : i < step
                  ? 'bg-earth/50'
                  : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Lesson content */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-4xl mx-auto">
        {renderStep()}
      </div>

      {/* Navigation */}
      <NavigationArrows
        onBack={
          step > 0
            ? () => setStep(step - 1)
            : () => navigate('/planets')
        }
        onNext={
          step < 3
            ? () => setStep(step + 1)
            : undefined
        }
        showNext={step < 3}
        backLabel="Back"
        nextLabel="Next"
      />
    </div>
  );
};

export default AdditionEarth;