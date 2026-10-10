import { tx } from '@/i18n/tx';
import { PATHS } from '@/content/catalog';
import { useAccessibility } from '@/context/AccessibilityContext';
import type { ColorTheme, DisplayStyle } from '@/lib/accessibility';

const AppearanceSection = () => {
  const { prefs, setPref } = useAccessibility();
  const setTheme = (theme: ColorTheme) => {
    setPref('colorTheme', theme);
    setPref('highContrast', theme === 'contrast');
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-lg font-semibold">{tx('paths:appearance')}</h2>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{tx('paths:theme')}</legend>
        <div className="flex flex-wrap gap-2">
          {(['light', 'dark', 'contrast', 'system'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              aria-pressed={prefs.colorTheme === theme}
              className="min-h-[48px] rounded-xl border border-border px-3"
              onClick={() => setTheme(theme)}
            >
              {tx(`paths:theme${theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : theme === 'contrast' ? 'Contrast' : 'System'}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-3 min-h-[48px]">
        <input type="checkbox" checked={prefs.dyslexiaFont} onChange={(event) => setPref('dyslexiaFont', event.target.checked)} />
        <span>
          <span className="block font-medium">{tx('paths:dyslexia')}</span>
          <span className="block text-sm text-muted-foreground">{tx('paths:dyslexiaHelp')}</span>
        </span>
      </label>
      <label className="flex items-center gap-3 min-h-[48px]">
        <input type="checkbox" checked={prefs.reduceMotion} onChange={(event) => setPref('reduceMotion', event.target.checked)} />
        <span>
          <span className="block font-medium">{tx('paths:motion')}</span>
          <span className="block text-sm text-muted-foreground">{tx('paths:motionHelp')}</span>
        </span>
      </label>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{tx('paths:display')}</legend>
        <div className="flex flex-wrap gap-2">
          {(['playful', 'standard', 'minimal'] as const).map((style) => (
            <button
              key={style}
              type="button"
              aria-pressed={prefs.displayStyle === style}
              className="min-h-[48px] rounded-xl border border-border px-3"
              onClick={() => setPref('displayStyle', style as DisplayStyle)}
            >
              {tx(`paths:display${style === 'playful' ? 'Playful' : style === 'standard' ? 'Standard' : 'Minimal'}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm">
        {tx('paths:planetTheme')}
        <select
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 min-h-[48px]"
          value={prefs.planetTheme}
          onChange={(event) => setPref('planetTheme', event.target.value)}
        >
          <option value="">{tx('paths:planetThemeNone')}</option>
          {PATHS.map((path) => (
            <option key={path.id} value={path.id}>{tx(path.titleKey)}</option>
          ))}
        </select>
      </label>
    </section>
  );
};

export default AppearanceSection;
