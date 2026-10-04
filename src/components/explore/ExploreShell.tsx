import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AccessibilityQuickButton from '@/components/AccessibilityQuickButton';
import VoiceQuickButton from '@/components/VoiceQuickButton';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';

interface ExploreShellProps {
  title: string;
  speakText: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  testId?: string;
}

const ExploreShell: React.FC<ExploreShellProps> = ({ title, speakText, children, footer, testId }) => {
  const { t } = useTranslation('explore');
  const navigate = useNavigate();
  const { prefs } = useAccessibility();

  return (
    <div
      className={`min-h-screen bg-background ${prefs.calmBackground ? '' : 'subtle-stars'} flex flex-col`}
      data-testid={testId}
    >
      <a
        href="#explore-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:start-2 focus:top-2 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:ring-2 focus:ring-primary"
      >
        {t('hub_title')}
      </a>
      <header className="flex items-center justify-between gap-2 px-3 py-3 border-b border-border">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate('/explore')}>
            {t('back_hub')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={() => navigate(STUDENT_HUB_PATH)}
          >
            {t('back_planets')}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <ReadAloudButton text={speakText} />
          <VoiceQuickButton />
          <AccessibilityQuickButton />
        </div>
      </header>
      <main id="explore-content" tabIndex={-1} className="flex-1 overflow-auto px-3 sm:px-6 py-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('solar_moon')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{t('untimed_note')}</p>
          <p className="text-sm text-muted-foreground">{t('no_score')}</p>
          {children}
        </div>
      </main>
      {footer ? (
        <footer className="border-t border-border px-3 py-3">
          <div className="mx-auto max-w-3xl">{footer}</div>
        </footer>
      ) : null}
    </div>
  );
};

export default ExploreShell;
