import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface NavigationArrowsProps {
  onBack?: () => void;
  onNext?: () => void;
  showBack?: boolean;
  showNext?: boolean;
  nextLabel?: string;
  backLabel?: string;
  /** Override the default chevron on the next/right button. */
  nextIcon?: React.ReactNode;
  /** Sit in the lesson footer instead of a full-width overlay that steals taps. */
  embedded?: boolean;
}

const navBtnClass =
  'pointer-events-auto flex items-center gap-2 border-border bg-card/95 text-foreground hover:bg-muted shadow-sm transition-all duration-200 active:scale-95 min-h-[44px] min-w-[44px] cursor-pointer touch-manipulation';

const NavigationArrows: React.FC<NavigationArrowsProps> = ({
  onBack,
  onNext,
  showBack = true,
  showNext = true,
  nextLabel,
  backLabel,
  nextIcon,
  embedded = false,
}) => {
  return (
    <div
      className={
        embedded
          ? 'flex justify-between gap-3 px-3 sm:px-6 py-3 pointer-events-none'
          : 'fixed left-0 right-0 flex justify-between px-4 sm:px-8 z-20 pointer-events-none'
      }
      style={
        embedded
          ? undefined
          : {
              bottom: 'max(1.5rem, env(safe-area-inset-bottom))',
              paddingLeft: 'max(1rem, env(safe-area-inset-left))',
              paddingRight: 'max(1rem, env(safe-area-inset-right))',
            }
      }
    >
      {showBack && onBack ? (
        <Button type="button" onClick={onBack} variant="outline" className={navBtnClass}>
          <ChevronLeft className="h-6 w-6 shrink-0 text-foreground" strokeWidth={2.5} aria-hidden />
          <span>{backLabel ?? 'Back'}</span>
        </Button>
      ) : (
        <div />
      )}

      {showNext && onNext ? (
        <Button type="button" onClick={onNext} variant="outline" className={navBtnClass}>
          {nextIcon ? (
            <>
              {nextIcon}
              <span>{nextLabel ?? 'Next'}</span>
            </>
          ) : (
            <>
              <span>{nextLabel ?? 'Next'}</span>
              <ChevronRight className="h-6 w-6 shrink-0 text-foreground" strokeWidth={2.5} aria-hidden />
            </>
          )}
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
};

export default NavigationArrows;
