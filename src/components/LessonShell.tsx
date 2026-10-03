import { tx } from '@/i18n/tx';
import React from 'react';
import HomeButton from '@/components/HomeButton';
import NavigationArrows from '@/components/NavigationArrows';
import Zoomable from '@/components/Zoomable';
import AccessibilityQuickButton from '@/components/AccessibilityQuickButton';
import BreakCard from '@/components/BreakCard';
import { useAccessibility } from '@/context/AccessibilityContext';
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
 * Lesson chrome. Progress is shown as dots AND as words ("Step 3 of 6"),
 * so it never depends on colour or shape alone.
 */
const LessonShell: React.FC<LessonShellProps> = ({
  children, planet, totalSteps, step, onBack, onNext,
  showBack = true, showNext = true, nextLabel, backLabel,
}) => {
  const dots = PLANET_DOT[planet];
  const { prefs } = useAccessibility();
  const stepLabel = tx('ui:stepOf', { step: Math.min(step + 1, totalSteps), total: totalSteps });

  return (
    <div className={`lesson-shell bg-background ${prefs.calmBackground ? '' : 'subtle-stars'} flex flex-col overflow-hidden`}>
      <a href="#lesson-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:start-2 focus:top-2 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:ring-2 focus:ring-primary">{tx('ui:s_3a35b15820')}</a>

      <header className="relative flex items-center justify-center min-h-14 shrink-0 px-16 py-2">
        <div className="absolute start-2 top-1/2 -translate-y-1/2">
          <HomeButton embedded />
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex max-w-[210px] flex-wrap justify-center gap-2" aria-hidden>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i}
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-colors ${
                  i === step ? dots.active : i < step ? dots.complete : 'bg-muted'
                }`} />
            ))}
          </div>
          {/* The words are the real progress label; the dots are decoration. */}
          <p className="text-xs font-medium text-muted-foreground">{stepLabel}</p>
        </div>

        <div className="absolute end-2 top-1/2 -translate-y-1/2">
          <AccessibilityQuickButton />
        </div>
      </header>

      <main id="lesson-content" tabIndex={-1}
        className="lesson-shell-main flex-1 overflow-auto overscroll-contain px-3 sm:px-8 py-2">
        <Zoomable resetKey={`${planet}-${step}`} className="flex flex-col w-full max-w-4xl mx-auto min-h-full pb-4">
          {children}
        </Zoomable>
      </main>

      <footer className="shrink-0 z-30 bg-background border-t border-border">
        {prefs.breaks && (
          <div className="flex justify-center py-2">
            <BreakCard />
          </div>
        )}
        <NavigationArrows
          embedded onBack={onBack} onNext={onNext}
          showBack={showBack} showNext={showNext}
          nextLabel={nextLabel} backLabel={backLabel}
        />
      </footer>
    </div>
  );
};

export default LessonShell;
