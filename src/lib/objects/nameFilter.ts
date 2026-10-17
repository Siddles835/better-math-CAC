const BLOCKLIST = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'damn',
  'crap',
  'bastard',
  'idiot',
  'stupid',
];

const NAME_HINT =
  /^(mr|mrs|ms|miss|dr)\b|\b(mom|dad|mama|papa|brother|sister|grandma|grandpa)\b/i;

export interface NameCheck {
  ok: boolean;
  reason?: 'required' | 'length' | 'profanity' | 'person' | 'digits';
}

export const checkObjectName = (raw: string): NameCheck => {
  const value = raw.trim();
  if (!value) return { ok: false, reason: 'required' };
  if (value.length < 1 || value.length > 24) return { ok: false, reason: 'length' };
  const lower = value.toLowerCase();
  if (BLOCKLIST.some((word) => lower.includes(word))) return { ok: false, reason: 'profanity' };
  if (/\d/.test(value)) return { ok: false, reason: 'digits' };
  if (NAME_HINT.test(value)) return { ok: false, reason: 'person' };
  return { ok: true };
};

/** Simple English / Spanish plural guess. Other languages return the same word. */
export const guessMany = (one: string, lang: string): string => {
  const word = one.trim();
  if (!word) return '';
  if (lang !== 'en' && lang !== 'es') return word;
  if (lang === 'es') {
    if (/[aeiouáéíóú]$/i.test(word)) return `${word}s`;
    return `${word}es`;
  }
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
};
