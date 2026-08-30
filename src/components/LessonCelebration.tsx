import React from 'react';
import { Rocket, Sparkles, Star } from 'lucide-react';

type LessonType = 'counting' | 'addition' | 'subtraction';

interface LessonCelebrationProps {
  lessonType: LessonType;
  title?: string;
  message?: string;
}

const COPY: Record<LessonType, { title: string; message: string; tip: string }> = {
  counting: {
    title: 'Counting Star!',
    message: 'You practiced counting carefully — great focus.',
    tip: 'Tip: Point to each object once as you count.',
  },
  addition: {
    title: 'Addition Ace!',
    message: 'You put groups together to find the total.',
    tip: 'Tip: Start with the bigger number, then count up the smaller one. (Example: 2 + 5 → say 5, then 6, 7.)',
  },
  subtraction: {
    title: 'Subtraction Hero!',
    message: 'You took some away and found what was left.',
    tip: 'Tip: Cross out the ones you remove, then count the rest.',
  },
};

/** Self-contained celebration panel (no external video embeds). */
const LessonCelebration: React.FC<LessonCelebrationProps> = ({
  lessonType,
  title,
  message,
}) => {
  const copy = COPY[lessonType];

  return (
    <div className="w-full max-w-xl mx-auto bg-card rounded-2xl p-8 border border-border shadow-sm animate-fade-in">
      <div className="relative aspect-video rounded-xl bg-gradient-to-br from-primary/20 via-muted to-accent/20 overflow-hidden flex items-center justify-center mb-6">
        <div className="absolute inset-0 subtle-stars opacity-60" />
        <Star className="absolute top-6 left-8 w-6 h-6 text-star animate-gentle-float" />
        <Sparkles className="absolute top-10 right-10 w-7 h-7 text-accent animate-gentle-float" />
        <Rocket className="relative w-20 h-20 text-primary animate-gentle-float" />
      </div>
      <h3 className="text-2xl font-semibold text-foreground mb-2 text-center">
        {title ?? copy.title}
      </h3>
      <p className="text-muted-foreground text-center mb-4">
        {message ?? copy.message}
      </p>
      <p className="text-sm text-center text-primary/90 bg-primary/10 rounded-xl px-4 py-3">
        {copy.tip}
      </p>
    </div>
  );
};

export default LessonCelebration;
