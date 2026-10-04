import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';

interface ReflectionPromptProps {
  onChoose?: (key: string) => void;
}

const KEYS = ['ref_proud', 'ref_curious', 'ref_want_another'] as const;

const ReflectionPrompt: React.FC<ReflectionPromptProps> = ({ onChoose }) => {
  const { t } = useTranslation('explore');
  const { announce } = useAccessibility();
  const [chosen, setChosen] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/40 p-4" role="group" aria-label={t('reflection_title')}>
      <p className="mb-3 text-sm font-medium text-foreground">{t('reflection_title')}</p>
      <div className="flex flex-wrap gap-2">
        {KEYS.map((key) => (
          <Button
            key={key}
            type="button"
            variant={chosen === key ? 'default' : 'outline'}
            className="min-h-11"
            aria-pressed={chosen === key}
            onClick={() => {
              setChosen(key);
              announce(t(key));
              onChoose?.(key);
            }}
          >
            {t(key)}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ReflectionPrompt;
