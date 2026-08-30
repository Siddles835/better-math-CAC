import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudentHubPath } from '@/hooks/useStudentHubPath';

interface HomeButtonProps {
  /** Place in a header row instead of overlaying the lesson title. */
  embedded?: boolean;
}

const HomeButton: React.FC<HomeButtonProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const hubPath = useStudentHubPath();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => navigate(hubPath)}
      className={
        embedded
          ? 'relative z-10 bg-card/90 backdrop-blur-sm border border-border text-foreground hover:bg-muted shadow-md min-h-[44px] min-w-[44px] cursor-pointer touch-manipulation'
          : 'fixed z-50 bg-card/90 backdrop-blur-sm border border-border text-foreground hover:bg-muted shadow-md min-h-[48px] min-w-[48px] cursor-pointer touch-manipulation'
      }
      style={
        embedded
          ? undefined
          : {
              top: 'max(1rem, env(safe-area-inset-top))',
              left: 'max(1rem, env(safe-area-inset-left))',
            }
      }
      aria-label="Return to planet selection"
    >
      <Home className="h-5 w-5 text-foreground" strokeWidth={2.25} aria-hidden />
    </Button>
  );
};

export default HomeButton;
