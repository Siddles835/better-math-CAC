import React from 'react';
import HomeButton from '@/components/HomeButton';
import NavigationArrows from '@/components/NavigationArrows';
import Zoomable from '@/components/Zoomable';
import type { PlanetId } from '@/lib/planets';

const PLANET_DOT: Record<PlanetId, { active: string; complete: string }> = {
  sun: { active: 'bg-sun', complete: 'bg-sun/50' },
  mercury: { active: 'bg-mercury', complete: 'bg-mercury/50' },
  venus: { active: 'bg-venus', complete: 'bg-venus/50' },
  earth: { active: 'bg-earth', complete: 'bg-earth/50' },
  mars: { active: 'bg-mars', complete: 'bg-mars/50' },
  jupiter: { active: 'bg-jupiter', complete: 'bg-jupiter/50' },
  saturn: { active: 'bg-saturn', complete: 'bg-saturn/50' },
  uranus: { active: 'bg-uranus', complete: 'bg-uranus/50' },
  neptune: { active: 'bg-neptune', complete: 'bg-neptune/50' },
};

interface LessonShellProps {
  children: React.ReactNode;
  planet: PlanetId;
  totalSteps: number;
  step: number;
  onBack?: () => void;
  onNext?: () => void;
  showBack?: boolean;
  showNext?: boolean;
  nextLabel?: string;
  backLabel?: string;
}

/**
 * Phone/tablet lesson chrome: home + progress in a real header, content
 * scrolls in the middle, Back/Next live in a footer so they never cover
 * apples, cards, or quiz buttons (and iOS can actually receive the tap).
 */
const LessonShell: React.FC<LessonShellProps> = ({
  children,
  planet,
  totalSteps,
  step,
  onBack,
  onNext,
  showBack = true,
  showNext = true,
  nextLabel,
  backLabel,
}) => {
  const dots = PLANET_DOT[planet];

  return (
    <div className="lesson-shell bg-background subtle-stars flex flex-col overflow-hidden">
      <header className="relative flex items-center justify-center min-h-14 shrink-0 px-16 py-2">
        <div className="absolute left-2 top-1/2 -translate-y-1/2">
          <HomeButton embedded />
        </div>
        <div className="flex justify-center gap-2" aria-hidden>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-colors ${
                i === step ? dots.active : i < step ? dots.complete : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </header>

      <main className="lesson-shell-main flex-1 overflow-auto overscroll-contain px-3 sm:px-8 py-2">
        <Zoomable resetKey={`${planet}-${step}`} className="flex flex-col w-full max-w-4xl mx-auto min-h-full pb-4">
          {children}
        </Zoomable>
      </main>

      <footer className="shrink-0 z-30 bg-background border-t border-border">
        <NavigationArrows
          embedded
          onBack={onBack}
          onNext={onNext}
          showBack={showBack}
          showNext={showNext}
          nextLabel={nextLabel}
          backLabel={backLabel}
        />
      </footer>
    </div>
  );
};

export default LessonShell;
