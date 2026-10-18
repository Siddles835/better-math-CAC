import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sigma } from 'lucide-react';
import MathHelperPanel from '@/components/MathHelperPanel';

const MathHelperButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation('helper');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={t('open')}
        title={t('open')}
        data-testid="math-helper-button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-border bg-card text-primary shadow-sm hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      >
        <Sigma className="w-6 h-6" aria-hidden />
      </button>
      <MathHelperPanel open={open} onOpenChange={setOpen} />
    </>
  );
};

export default MathHelperButton;
