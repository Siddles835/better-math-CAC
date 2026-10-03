import { tx } from '@/i18n/tx';
import React, { useState } from 'react';
import { Accessibility } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import AccessibilityPanel from '@/components/AccessibilityPanel';

const AccessibilityQuickButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" aria-label={tx('ui:s_d8f9cb9790')} title={tx('ui:s_d8f9cb9790')}
          className={`inline-flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-border bg-card text-primary shadow-sm hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}>
          <Accessibility className="w-6 h-6" aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tx('ui:s_d8f9cb9790')}</DialogTitle>
          <DialogDescription>{tx('ui:s_8b7d359ec0')}</DialogDescription>
        </DialogHeader>
        <AccessibilityPanel />
      </DialogContent>
    </Dialog>
  );
};

export default AccessibilityQuickButton;
