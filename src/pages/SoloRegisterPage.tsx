import { tx } from '@/i18n/tx';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dices } from 'lucide-react';
import AuthNavButton from '@/components/AuthNavButton';
import { generateUsername } from '@/lib/usernames';
import { hapticTap } from '@/lib/haptics';
import { normalizeLabel } from '@/lib/classroom';
import {
  SOLO_CLASS_CODE,
  createSoloProgress,
  loadSoloProgress,
  normalizeSoloPin,
  saveSoloPending,
  saveSoloProgress,
  soloProgressToStudent,
  verifySoloPin,
} from '@/lib/solo';
import { setActiveStudent } from '@/lib/session';
import { useGame } from '@/context/GameContext';
import { STUDENT_HUB_PATH } from '@/lib/studentHub';

const SoloRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { hydrateFromStudent, hydrateClassMax } = useGame();
  const existing = loadSoloProgress();
  const [username, setUsername] = useState(() => existing?.displayName || generateUsername());
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [resumePin, setResumePin] = useState('');
  const [error, setError] = useState('');

  const rollNewUsername = () => {
    hapticTap();
    setUsername(generateUsername());
    setError('');
  };

  const enterSolo = (progress: ReturnType<typeof createSoloProgress>) => {
    hydrateClassMax(progress.unlockPlanet);
    hydrateFromStudent(soloProgressToStudent(progress));
    setActiveStudent({
      classCode: SOLO_CLASS_CODE,
      nickname: progress.nickname,
      displayName: progress.displayName,
      solo: true,
    });
    navigate(STUDENT_HUB_PATH, { replace: true });
  };

  const continueExisting = () => {
    const progress = loadSoloProgress();
    if (!progress) {
      setError(tx('ui:solo_missingProgress'));
      return;
    }
    if (progress.pin && !verifySoloPin(progress, resumePin)) {
      setError(tx('ui:solo_badPin'));
      return;
    }
    enterSolo(progress);
  };

  const beginWithCheck = () => {
    const name = normalizeLabel(username);
    if (!name) {
      setError(tx('ui:solo_needName'));
      return;
    }
    if (usePin) {
      const normalized = normalizeSoloPin(pin);
      if (!normalized) {
        setError(tx('ui:solo_pinInvalid'));
        return;
      }
      saveSoloPending({ displayName: name, pin: normalized });
    } else {
      saveSoloPending({ displayName: name });
    }
    navigate('/level-check', { replace: false });
  };

  const startWithoutCheck = () => {
    const name = normalizeLabel(username);
    if (!name) {
      setError(tx('ui:solo_needName'));
      return;
    }
    let optionalPin: string | undefined;
    if (usePin) {
      optionalPin = normalizeSoloPin(pin);
      if (!optionalPin) {
        setError(tx('ui:solo_pinInvalid'));
        return;
      }
    }
    const progress = createSoloProgress(name, 'sun', 'sun', {
      pin: optionalPin,
      placementDone: false,
    });
    saveSoloProgress(progress);
    enterSolo(progress);
  };

  return (
    <div className="min-h-screen bg-background subtle-stars flex items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md bg-card/95 p-6 rounded-2xl shadow-lg border border-border animate-fade-in backdrop-blur-sm">
        <h2 className="text-2xl font-semibold mb-2">{tx('ui:solo_title')}</h2>
        <p className="text-muted-foreground mb-4">{tx('ui:solo_lead')}</p>
        <p className="text-sm text-muted-foreground mb-6">{tx('ui:solo_privacy')}</p>

        {existing && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <p className="text-sm text-muted-foreground mb-3">
              {tx('ui:solo_foundProgress', { name: existing.displayName })}
            </p>
            {existing.pin && (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1" htmlFor="solo-resume-pin">
                  {tx('ui:solo_enterPin')}
                </label>
                <input
                  id="solo-resume-pin"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={resumePin}
                  onChange={(e) => {
                    setResumePin(e.target.value.replace(/\D/g, '').slice(0, 4));
                    setError('');
                  }}
                  className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground tracking-[0.4em] text-center text-xl min-h-[48px]"
                  placeholder="••••"
                />
              </div>
            )}
            <button
              type="button"
              onClick={continueExisting}
              className="w-full bg-emerald-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-emerald-500 active:scale-[0.98] transition-all duration-200 min-h-[48px]"
            >
              {tx('ui:solo_continue')}
            </button>
          </div>
        )}

        <label className="block mb-2 font-medium">{tx('ui:s_36da6e37c5')}</label>
        <div className="flex items-stretch gap-2 mb-2">
          <div
            className="flex-1 flex items-center justify-center px-4 py-3 border border-emerald-500/40 bg-emerald-500/10 rounded-xl min-h-[48px]"
            aria-live="polite"
          >
            <span className="text-xl font-bold tracking-wide text-foreground">{username}</span>
          </div>
          <button
            type="button"
            onClick={rollNewUsername}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-background text-foreground font-semibold hover:bg-muted min-h-[48px]"
            aria-label={tx('ui:s_8e40309ccd')}
          >
            <Dices className="w-5 h-5" aria-hidden />
            <span className="hidden sm:inline">{tx('ui:s_ddbcd37145')}</span>
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{tx('ui:joinDice')}</p>

        <fieldset className="mb-4 rounded-xl border border-border p-3">
          <legend className="px-1 text-sm font-medium">{tx('ui:solo_pinLegend')}</legend>
          <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={usePin}
              onChange={(e) => {
                setUsePin(e.target.checked);
                setError('');
              }}
              className="mt-1.5 h-4 w-4"
            />
            <span className="text-sm text-muted-foreground">{tx('ui:solo_pinOptional')}</span>
          </label>
          {usePin && (
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1" htmlFor="solo-new-pin">
                {tx('ui:solo_pinLabel')}
              </label>
              <input
                id="solo-new-pin"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setError('');
                }}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground tracking-[0.4em] text-center text-xl min-h-[48px]"
                placeholder="1234"
              />
            </div>
          )}
        </fieldset>

        {error && (
          <div className="mb-4 p-3 bg-destructive/15 text-destructive rounded-xl text-sm border border-destructive/30">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 mt-4">
          <button
            type="button"
            onClick={beginWithCheck}
            className="w-full bg-emerald-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-emerald-500 active:scale-[0.98] transition-all duration-200 min-h-[48px]"
          >
            {tx('ui:solo_startCheck')}
          </button>
          <button
            type="button"
            onClick={startWithoutCheck}
            className="w-full border border-border bg-background text-foreground px-5 py-3 rounded-xl font-semibold hover:bg-muted active:scale-[0.98] transition-all duration-200 min-h-[48px]"
          >
            {tx('ui:solo_skipCheck')}
          </button>
          <div className="flex justify-between items-center gap-3 pt-1">
            <AuthNavButton onClick={() => navigate('/')} />
            <button
              type="button"
              onClick={() => navigate('/student-register')}
              className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
            >
              {tx('ui:solo_haveClassCode')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoloRegisterPage;
