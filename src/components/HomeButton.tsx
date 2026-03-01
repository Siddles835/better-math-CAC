import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HomeButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate('/solar-system')}
      className="fixed top-4 left-4 z-50 bg-card/80 backdrop-blur-sm border border-border hover:bg-card"
      aria-label="Go to solar system"
    >
      <Home className="w-5 h-5" />
    </Button>
  );
};

export default HomeButton;
