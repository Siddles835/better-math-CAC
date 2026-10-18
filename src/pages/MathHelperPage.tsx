import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MathHelperPanel from '@/components/MathHelperPanel';
import ReadAloudButton from '@/components/ReadAloudButton';
import { Button } from '@/components/ui/button';
import { MATH_SYMBOLS } from '@/content/mathSymbols';
import { useAccessibility } from '@/context/AccessibilityContext';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';

const MathHelperPage: React.FC = () => {
  const { t } = useTranslation('helper');
  const navigate = useNavigate();
  const { prefs } = useAccessibility();
  const [panelOpen, setPanelOpen] = useState(false);
  const [focusId, setFocusId] = useState(MATH_SYMBOLS[0]?.id ?? '');

  const focused = useMemo(
    () => MATH_SYMBOLS.find((entry) => entry.id === focusId) ?? MATH_SYMBOLS[0],
    [focusId]
  );

  const speak = focused
    ? `${t(focused.nameKey)}. ${t(focused.spokenKey)}. ${t(focused.meaningKey)}`
    : t('pageTitle');

  return (
    <div
      className={`min-h-screen ${prefs.calmBackground ? 'bg-background' : 'space-bg subtle-stars'} px-4 py-6`}
      data-testid="math-helper-page"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate(STUDENT_HUB_PATH)}>
            {t('close')}
          </Button>
          <Button type="button" className="min-h-11" onClick={() => setPanelOpen(true)}>
            {t('open')}
          </Button>
        </div>

        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-foreground">{t('pageTitle')}</h1>
          <p className="text-muted-foreground">{t('pageLead')}</p>
          <div className="flex justify-center">
            <ReadAloudButton text={speak} />
          </div>
        </header>

        <ul className="grid gap-3 sm:grid-cols-2 list-none p-0 m-0">
          {MATH_SYMBOLS.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => {
                  setFocusId(entry.id);
                  setPanelOpen(true);
                }}
                className="flex w-full min-h-[5.5rem] items-center gap-3 rounded-2xl border border-border/80 bg-card/30 p-4 text-start transition hover:border-sky-400/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                <span className="text-4xl font-semibold tabular-nums" dir="ltr" aria-hidden>
                  {entry.symbol}
                </span>
                <span>
                  <span className="block text-lg font-semibold">{t(entry.nameKey)}</span>
                  <span className="block text-sm text-muted-foreground">{t(entry.meaningKey)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <MathHelperPanel open={panelOpen} onOpenChange={setPanelOpen} />
    </div>
  );
};

export default MathHelperPage;
