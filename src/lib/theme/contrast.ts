/** HSL channels: hue 0-360, saturation and lightness 0-100. */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface ThemeTokens {
  background: Hsl;
  foreground: Hsl;
  card: Hsl;
  cardForeground: Hsl;
  primary: Hsl;
  primaryForeground: Hsl;
  mutedForeground: Hsl;
}

export const THEME_TOKENS: Record<'light' | 'dark' | 'contrast', ThemeTokens> = {
  light: {
    background: { h: 40, s: 33, l: 97 },
    foreground: { h: 230, s: 25, l: 12 },
    card: { h: 0, s: 0, l: 100 },
    cardForeground: { h: 230, s: 25, l: 12 },
    primary: { h: 200, s: 55, l: 28 },
    primaryForeground: { h: 0, s: 0, l: 100 },
    mutedForeground: { h: 220, s: 12, l: 28 },
  },
  dark: {
    background: { h: 230, s: 25, l: 10 },
    foreground: { h: 220, s: 15, l: 96 },
    card: { h: 230, s: 20, l: 14 },
    cardForeground: { h: 220, s: 15, l: 96 },
    primary: { h: 200, s: 70, l: 62 },
    primaryForeground: { h: 230, s: 30, l: 8 },
    mutedForeground: { h: 220, s: 12, l: 78 },
  },
  contrast: {
    background: { h: 0, s: 0, l: 0 },
    foreground: { h: 0, s: 0, l: 100 },
    card: { h: 0, s: 0, l: 0 },
    cardForeground: { h: 0, s: 0, l: 100 },
    primary: { h: 55, s: 100, l: 50 },
    primaryForeground: { h: 0, s: 0, l: 0 },
    mutedForeground: { h: 0, s: 0, l: 100 },
  },
};

const channel = (value: number): number => {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

export const hslToRgb = ({ h, s, l }: Hsl): [number, number, number] => {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = lig - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};

export const relativeLuminance = (hsl: Hsl): number => {
  const [r, g, b] = hslToRgb(hsl);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const contrastRatio = (a: Hsl, b: Hsl): number => {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

export const themePairs = (tokens: ThemeTokens): Array<[string, Hsl, Hsl]> => [
  ['foreground/background', tokens.foreground, tokens.background],
  ['muted/background', tokens.mutedForeground, tokens.background],
  ['card/card', tokens.cardForeground, tokens.card],
  ['primary/primary', tokens.primaryForeground, tokens.primary],
];

export const hslCss = ({ h, s, l }: Hsl): string => `${h} ${s}% ${l}%`;
