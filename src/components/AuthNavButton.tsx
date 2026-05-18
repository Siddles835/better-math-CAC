import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthNavButtonProps {
  onClick: () => void;
  label?: string;
}

/** Visible back control for login/register screens (lucide + text). */
const AuthNavButton: React.FC<AuthNavButtonProps> = ({ onClick, label = 'Back' }) => (
  <Button
    type="button"
    variant="outline"
    onClick={onClick}
    className="inline-flex items-center gap-2 border-border bg-card text-foreground hover:bg-muted"
  >
    <ChevronLeft className="h-5 w-5 shrink-0 text-foreground" strokeWidth={2.5} aria-hidden />
    <span>{label}</span>
  </Button>
);

export default AuthNavButton;
