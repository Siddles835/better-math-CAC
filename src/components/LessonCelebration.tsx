import React from 'react';

type LessonType = 'counting' | 'addition' | 'subtraction';

interface LessonCelebrationProps {
  lessonType: LessonType;
  title?: string;
  message?: string;
}

const COPY: Record<LessonType, { title: string; message: string; tip: string }> = {
  counting: {
    title: 'Counting practice complete',
    message: 'You practiced counting each object once.',
    tip: 'Point to each object once as you count.',
  },
  addition: {
    title: 'Addition practice complete',
    message: 'You put groups together to find the total.',
    tip: 'Start with the bigger number, then count on the smaller one. Example: 2 + 5 → say 5, then 6, 7.',
  },
  subtraction: {
    title: 'Subtraction practice complete',
    message: 'You took some away and found what was left.',
    tip: 'Cross out the ones you remove, then count the rest.',
  },
};

const LessonCelebration: React.FC<LessonCelebrationProps> = ({ lessonType, title, message }) => {
  const copy = COPY[lessonType];

  return (
    <div className="w-full max-w-xl mx-auto bg-card rounded-2xl p-6 border border-border">
      <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
        {title ?? copy.title}
      </h3>
      <p className="text-muted-foreground text-center mb-4">{message ?? copy.message}</p>
      <p className="text-sm text-center text-foreground/90 bg-muted/60 rounded-xl px-4 py-3">
        {copy.tip}
      </p>
    </div>
  );
};

export default LessonCelebration;
