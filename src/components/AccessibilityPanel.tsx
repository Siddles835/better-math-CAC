import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/context/AccessibilityContext';
import type { AccessibilityPrefs } from '@/lib/accessibility';

type BoolKey = {
  [K in keyof AccessibilityPrefs]: AccessibilityPrefs[K] extends boolean ? K : never;
}[keyof AccessibilityPrefs];

interface ToggleRowProps { id: BoolKey; label: string; hint: string }

const TOGGLES: ToggleRowProps[] = [
  { id: 'easyReadSpacing', label: 'Easy-read spacing', hint: 'More space between letters and lines.' },
  { id: 'highContrast', label: 'High contrast', hint: 'Stronger contrast between text and background.' },
  { id: 'colorSafeLabels', label: 'Words with colours', hint: 'Right and wrong always show a word and a symbol, never colour alone.' },
  { id: 'reduceMotion', label: 'Less movement', hint: 'Turns off animations and moving decoration.' },
  { id: 'calmBackground', label: 'Calm background', hint: 'A plain background with no stars.' },
  { id: 'focusMode', label: 'One thing at a time', hint: 'Hides extra side notes so only the task is on screen.' },
  { id: 'autoReadAloud', label: 'Read pages aloud', hint: 'Each page is read out when it opens. The speaker button still works.' },
  { id: 'soundAsText', label: 'Show sounds as text', hint: 'Anything said or played is written on screen too.' },
  { id: 'muteSounds', label: 'Mute sound', hint: 'No speech or sound effects.' },
  { id: 'biggerButtons', label: 'Bigger buttons', hint: 'Larger targets that are easier to tap or click.' },
  { id: 'breaks', label: 'Break button', hint: 'Adds a Take a break button inside lessons.' },
  { id: 'summaryFirst', label: 'Summary first', hint: 'A short overview before the full explanation.' },
  { id: 'workedExampleFirst', label: 'Worked example first', hint: 'See one solved example before you practise.' },
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
        <h3 className="text-lg font-semibold">Text size</h3>
        <p className="text-sm text-muted-foreground mb-3">Pick the size that is easiest to read.</p>
        <div className="flex flex-wrap gap-2">
          {(['normal', 'large', 'xlarge'] as const).map((size) => (
            <Button key={size} type="button"
              variant={prefs.textSize === size ? 'default' : 'outline'}
              className="min-h-[48px]" aria-pressed={prefs.textSize === size}
              onClick={() => { setPref('textSize', size); announce(`Text size ${size}`); }}>
              {prefs.textSize === size ? <Check className="w-4 h-4 mr-2" aria-hidden /> : null}
              {size === 'normal' ? 'Normal' : size === 'large' ? 'Large' : 'Extra large'}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">How I answer</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Every way is accepted. This is just the one offered to you first.
        </p>
        <div className="flex flex-wrap gap-2">
          {([['any','Any way'],['type','Typing'],['choose','Choosing'],['draw','Drawing']] as const).map(([value, label]) => (
            <Button key={value} type="button"
              variant={prefs.answerMethod === value ? 'default' : 'outline'}
              className="min-h-[48px]" aria-pressed={prefs.answerMethod === value}
              onClick={() => { setPref('answerMethod', value); announce(`Answer method ${label}`); }}>
              {prefs.answerMethod === value ? <Check className="w-4 h-4 mr-2" aria-hidden /> : null}
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Pace</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Relaxed pace removes any hurry and gives extra time to think.
        </p>
        <div className="flex flex-wrap gap-2">
          {([['normal','Normal pace'],['relaxed','Relaxed pace']] as const).map(([value, label]) => (
            <Button key={value} type="button"
              variant={prefs.pacing === value ? 'default' : 'outline'}
              className="min-h-[48px]" aria-pressed={prefs.pacing === value}
              onClick={() => { setPref('pacing', value); announce(label); }}>
              {prefs.pacing === value ? <Check className="w-4 h-4 mr-2" aria-hidden /> : null}
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Screen and sound</h3>
        <ul className="mt-3 space-y-2">
          {TOGGLES.map(({ id, label, hint }) => {
            const on = prefs[id];
            return (
              <li key={id}>
                <button type="button" role="switch" aria-checked={on}
                  onClick={() => toggle(id, label)}
                  className="w-full text-left flex items-start gap-3 rounded-2xl border border-border bg-card p-4 min-h-[56px] hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <span aria-hidden className="mt-0.5 inline-flex w-6 h-6 shrink-0 items-center justify-center rounded-md border-2 border-foreground/50">
                    {on ? <Check className="w-4 h-4" /> : null}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium">{label}</span>
                    <span className="block text-sm text-muted-foreground">{hint}</span>
                  </span>
                  {/* Word, not colour, carries the state. */}
                  <span className="text-sm font-semibold">{on ? 'On' : 'Off'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <Button type="button" variant="outline" className="min-h-[48px]"
        onClick={() => { resetPrefs(); announce('Learning preferences reset'); }}>
        Reset to default
      </Button>
    </div>
  );
};

export default AccessibilityPanel;
