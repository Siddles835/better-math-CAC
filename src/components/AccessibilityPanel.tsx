import { tx } from '@/i18n/tx';
import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VoiceToggle from '@/components/VoiceToggle';
import { useAccessibility } from '@/context/AccessibilityContext';
import type { AccessibilityPrefs } from '@/lib/accessibility';

type BoolKey = {
  [K in keyof AccessibilityPrefs]: AccessibilityPrefs[K] extends boolean ? K : never;
}[keyof AccessibilityPrefs];

/** Voice on/off is VoiceToggle (voiceEnabled). muteSounds is SFX only. */
const TOGGLE_IDS: BoolKey[] = [
  'easyReadSpacing', 'highContrast', 'colorSafeLabels', 'reduceMotion', 'calmBackground',
  'focusMode', 'autoReadAloud', 'soundAsText', 'muteSounds', 'biggerButtons', 'breaks',
  'summaryFirst', 'workedExampleFirst',
];

const AccessibilityPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { prefs, setPref, resetPrefs, announce } = useAccessibility();

  const toggle = (key: BoolKey, label: string) => {
    const next = !prefs[key];
    setPref(key, next);
    announce(`${label} ${next ? 'on' : 'off'}`);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold">{tx('ui:s_3cc6e124a8')}</h3>
        <p className="text-sm text-muted-foreground mb-3">{tx('ui:s_aa1d292f81')}</p>
        <div className="flex flex-wrap gap-2">
          {(['normal', 'large', 'xlarge'] as const).map((size) => (
            <Button key={size} type="button"
              variant={prefs.textSize === size ? 'default' : 'outline'}
              className="min-h-[48px]" aria-pressed={prefs.textSize === size}
              onClick={() => { setPref('textSize', size); announce(`Text size ${size}`); }}>
              {prefs.textSize === size ? <Check className="w-4 h-4 me-2" aria-hidden /> : null}
              {tx(`ui:size_${size}`)}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">{tx('ui:s_3fb4420273')}</h3>
        <p className="text-sm text-muted-foreground mb-3">{tx('ui:s_192c760d71')}</p>
        <div className="flex flex-wrap gap-2">
          {(['any', 'type', 'choose', 'draw'] as const).map((value) => (
            <Button key={value} type="button"
              variant={prefs.answerMethod === value ? 'default' : 'outline'}
              className="min-h-[48px]" aria-pressed={prefs.answerMethod === value}
              onClick={() => { setPref('answerMethod', value); announce(tx(`ui:answer_${value}`)); }}>
              {prefs.answerMethod === value ? <Check className="w-4 h-4 me-2" aria-hidden /> : null}
              {tx(`ui:answer_${value}`)}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">{tx('ui:s_7a9a622659')}</h3>
        <p className="text-sm text-muted-foreground mb-3">{tx('ui:s_77063ac325')}</p>
        <div className="flex flex-wrap gap-2">
          {(['normal', 'relaxed'] as const).map((value) => (
            <Button key={value} type="button"
              variant={prefs.pacing === value ? 'default' : 'outline'}
              className="min-h-[48px]" aria-pressed={prefs.pacing === value}
              onClick={() => { setPref('pacing', value); announce(tx(`ui:pace_${value}`)); }}>
              {prefs.pacing === value ? <Check className="w-4 h-4 me-2" aria-hidden /> : null}
              {tx(`ui:pace_${value}`)}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">{tx('ui:s_3b5d9db120')}</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-3">{tx('ui:voicePanelHint')}</p>
        <VoiceToggle embedded className="mb-3" />
        <ul className="mt-3 space-y-2">
          {TOGGLE_IDS.map((id) => {
            const on = prefs[id];
            const label = tx(`ui:toggle_${id}`);
            const hint = tx(`ui:toggle_${id}_hint`);
            return (
              <li key={id}>
                <button type="button" role="switch" aria-checked={on}
                  onClick={() => toggle(id, label)}
                  className="w-full text-start flex items-start gap-3 rounded-2xl border border-border bg-card p-4 min-h-[56px] hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <span aria-hidden className="mt-0.5 inline-flex w-6 h-6 shrink-0 items-center justify-center rounded-md border-2 border-foreground/50">
                    {on ? <Check className="w-4 h-4" /> : null}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium">{label}</span>
                    <span className="block text-sm text-muted-foreground">{hint}</span>
                  </span>
                  {/* Words carry the state */}
                  <span className="text-sm font-semibold">{on ? tx('ui:switchOn') : tx('ui:switchOff')}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Button type="button" variant="outline" className="min-h-[48px]"
        onClick={() => { resetPrefs(); announce('Learning preferences reset'); }}>{tx('ui:s_39c90eb758')}</Button>
    </div>
  );
};

export default AccessibilityPanel;
