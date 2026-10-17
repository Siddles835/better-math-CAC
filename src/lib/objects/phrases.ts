import type { AppLang } from '@/lib/i18n/language';

export interface ObjectNamePair {
  one: string;
  many: string;
}

const nameFor = (n: number, names: ObjectNamePair): string => (n === 1 ? names.one : names.many);

type TemplateFn = (n: number, names: ObjectNamePair, extra?: number) => string;

const TEMPLATES: Record<
  AppLang,
  {
    count: TemplateFn;
    add: TemplateFn;
    subtract: TemplateFn;
  }
> = {
  en: {
    count: (n, names) => `You have ${n} ${nameFor(n, names)}. How many ${names.many} are there?`,
    add: (n, names, extra = 0) =>
      `You have ${n} ${nameFor(n, names)}. You get ${extra} more ${nameFor(extra, names)}. How many ${names.many} now?`,
    subtract: (n, names, extra = 0) =>
      `You have ${n} ${nameFor(n, names)}. ${extra} ${nameFor(extra, names)} go away. How many ${names.many} are left?`,
  },
  es: {
    count: (n, names) => `Tienes ${n} ${nameFor(n, names)}. ¿Cuántos ${names.many} hay?`,
    add: (n, names, extra = 0) =>
      `Tienes ${n} ${nameFor(n, names)}. Consigues ${extra} ${nameFor(extra, names)} más. ¿Cuántos ${names.many} hay ahora?`,
    subtract: (n, names, extra = 0) =>
      `Tienes ${n} ${nameFor(n, names)}. Se van ${extra} ${nameFor(extra, names)}. ¿Cuántos ${names.many} quedan?`,
  },
  'zh-Hans': {
    count: (n, names) => `你有 ${n} 个${names.one}。一共有多少个${names.one}？`,
    add: (n, names, extra = 0) =>
      `你有 ${n} 个${names.one}。又得到 ${extra} 个${names.one}。现在有多少个${names.one}？`,
    subtract: (n, names, extra = 0) =>
      `你有 ${n} 个${names.one}。拿走 ${extra} 个${names.one}。还剩多少个${names.one}？`,
  },
  hi: {
    count: (n, names) => `तुम्हारे पास ${n} ${nameFor(n, names)} हैं। कितने ${names.many} हैं?`,
    add: (n, names, extra = 0) =>
      `तुम्हारे पास ${n} ${nameFor(n, names)} हैं। ${extra} और ${nameFor(extra, names)} मिलते हैं। अब कितने ${names.many} हैं?`,
    subtract: (n, names, extra = 0) =>
      `तुम्हारे पास ${n} ${nameFor(n, names)} हैं। ${extra} ${nameFor(extra, names)} चले जाते हैं। कितने ${names.many} बचते हैं?`,
  },
  ar: {
    // Uses "many" form for all counts so dual forms are not guessed incorrectly.
    count: (n, names) => `معك ${n} ${names.many}. كم ${names.many} هناك؟`,
    add: (n, names, extra = 0) =>
      `معك ${n} ${names.many}. حصلت على ${extra} ${names.many} أخرى. كم ${names.many} الآن؟`,
    subtract: (n, names, extra = 0) =>
      `معك ${n} ${names.many}. ذهب ${extra} ${names.many}. كم ${names.many} بقي؟`,
  },
};

export const objectPhrase = (
  kind: 'count' | 'add' | 'subtract',
  lang: AppLang,
  n: number,
  names: ObjectNamePair,
  extra = 0
): string => TEMPLATES[lang]?.[kind](n, names, extra) ?? TEMPLATES.en[kind](n, names, extra);
