import React from 'react';
import { tx } from '@/i18n/tx';
import { Button } from '@/components/ui/button';

/** Returns the child to the planet's practice activity and leaves them there. */
const PracticeAgainButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button type="button" variant="outline" size="lg" onClick={onClick} data-testid="practice-again">
    {tx('ui:practiceAgain')}
  </Button>
);

export default PracticeAgainButton;
