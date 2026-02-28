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
          variant="ghost"
          className="flex items-center gap-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
          {backLabel && <span>{backLabel}</span>}
        </Button>
      ) : (
        <div />
      )}
      
      {showNext && onNext ? (
        <Button
          onClick={onNext}
          variant="ghost"
          className="flex items-center gap-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          {nextLabel && <span>{nextLabel}</span>}
          <ChevronRight className="w-6 h-6" />
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
};

export default NavigationArrows;
