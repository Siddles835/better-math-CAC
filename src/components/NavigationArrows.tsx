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
}

const NavigationArrows: React.FC<NavigationArrowsProps> = ({
  onBack,
  onNext,
  showBack = true,
  showNext = true,
  nextLabel,
  backLabel,
}) => {
  return (
    <div className="fixed bottom-8 left-0 right-0 flex justify-between px-8 z-10">
      {showBack && onBack ? (
        <Button
          onClick={onBack}
          variant="outline"
          className="flex items-center gap-2 border-border bg-card/90 text-foreground hover:bg-muted shadow-sm"
        >
          <ChevronLeft className="h-6 w-6 shrink-0 text-foreground" strokeWidth={2.5} aria-hidden />
          <span>{backLabel ?? 'Back'}</span>
        </Button>
      ) : (
        <div />
      )}
      
      {showNext && onNext ? (
        <Button
          onClick={onNext}
          variant="outline"
          className="flex items-center gap-2 border-border bg-card/90 text-foreground hover:bg-muted shadow-sm"
        >
          <span>{nextLabel ?? 'Next'}</span>
          <ChevronRight className="h-6 w-6 shrink-0 text-foreground" strokeWidth={2.5} aria-hidden />
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
};

export default NavigationArrows;
