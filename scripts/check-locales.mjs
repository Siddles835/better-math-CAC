import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/locales');
const langs = ['en', 'zh-Hans', 'hi', 'es', 'ar'];
const pluralForms = {
  en: ['one', 'other'],
  es: ['one', 'other'],
  hi: ['one', 'other'],
  'zh-Hans': ['other'],
  ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
};
const suffixes = ['zero', 'one', 'two', 'few', 'many', 'other'];
const allowValues = new Set([
  'MathLift',
  'Devanagari',
  'Macro-F1',
  'mathlift1234@gmail.com',
  'PIN',
]);
const errors = [];

const read = (lang, file) => JSON.parse(fs.readFileSync(path.join(root, lang, file), 'utf8'));

const flatten = (value, prefix, out) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}.${index}`, out));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return;
  }
  out[prefix] = value;
};

const placeholders = (text) => [...String(text).matchAll(/\{\{[^}]+\}\}/g)].map((match) => match[0]).sort().join('|');

const files = fs.readdirSync(path.join(root, 'en')).filter((name) => name.endsWith('.json'));

for (const file of files) {
  const flat = {};
  for (const lang of langs) {
    const filePath = path.join(root, lang, file);
    if (!fs.existsSync(filePath)) {
      errors.push(`${lang}/${file} is missing`);
      flat[lang] = {};
      continue;
    }
    const data = {};
    flatten(read(lang, file), '', data);
    flat[lang] = data;
  }

  const bases = new Set();
  for (const lang of langs) {
    for (const key of Object.keys(flat[lang])) {
      const match = key.match(/_(zero|one|two|few|many|other)$/);
      if (match) bases.add(key.slice(0, -match[1].length - 1));
    }
  }

  const plain = (key) => {
    const match = key.match(/_(zero|one|two|few|many|other)$/);
    return !(match && bases.has(key.slice(0, -match[1].length - 1)));
  };

  const enKeys = Object.keys(flat.en).filter(plain).sort();
  for (const lang of langs) {
    if (lang === 'en') continue;
    const keys = Object.keys(flat[lang]).filter(plain).sort();
    for (const key of enKeys) {
      if (!(key in flat[lang])) errors.push(`${lang}/${file} missing ${key}`);
    }
    for (const key of keys) {
      if (!(key in flat.en)) errors.push(`${lang}/${file} extra ${key}`);
    }
  }

  for (const base of bases) {
    for (const lang of langs) {
      for (const form of pluralForms[lang]) {
        const key = `${base}_${form}`;
        if (!(key in flat[lang])) errors.push(`${lang}/${file} missing plural ${key}`);
      }
      for (const form of suffixes) {
        const key = `${base}_${form}`;
        if (key in flat[lang] && !pluralForms[lang].includes(form)) {
          errors.push(`${lang}/${file} unexpected plural ${key}`);
        }
      }
    }
  }

  for (const lang of langs) {
    for (const [key, value] of Object.entries(flat[lang])) {
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`${lang}/${file} empty ${key}`);
        continue;
      }
      if (lang !== 'en' && key in flat.en && value === flat.en[key] && !allowValues.has(value)) {
        errors.push(`${lang}/${file} ${key} is identical to English`);
      }
      const pluralBase = key.replace(/_(zero|one|two|few|many|other)$/, '');
      const source = flat.en[key] ?? flat.en[`${pluralBase}_other`] ?? flat.en[`${pluralBase}_one`];
      if (source !== undefined && placeholders(value) !== placeholders(source)) {
        errors.push(`${lang}/${file} placeholders differ for ${key}`);
      }
    }
  }
}

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const allowExact = new Set([
  'MathLift',
  'Chrome',
  'Firefox',
  'Safari',
  'Edge',
  'Opera',
  'Firebase',
  'Firestore',
  'Vercel',
  'FERPA',
  'COPPA',
  'PIN',
  'PDF',
  'OK',
]);
const proseWord = /[A-Za-z]{4,}/;
const attrRe = /(aria-label|title|placeholder|alt)\s*=\s*(?:"([^"]+)"|'([^']+)'|\{\s*"([^"]+)"\s*\}|\{\s*'([^']+)'\s*\})/g;

const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const looksEnglish = (value) => {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text || allowExact.has(text)) return false;
  if (!proseWord.test(text)) return false;
  if (/^https?:\/\//.test(text)) return false;
  if (/^[a-z0-9_.:/-]+$/.test(text)) return false;
  if (/[{};]|=>|const |let |function |\.split\(|&&|\|\||===|!==|\?\s*\(|\w+\(/.test(text)) return false;
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  if (letters < 4 || letters / text.length < 0.45) return false;
  return true;
};

const scanFile = (filePath) => {
  const raw = stripComments(fs.readFileSync(filePath, 'utf8'));
  const rel = path.relative(srcRoot, filePath);
  attrRe.lastIndex = 0;
  let match;
  while ((match = attrRe.exec(raw))) {
    const value = match[2] || match[3] || match[4] || match[5] || '';
    if (looksEnglish(value)) errors.push(`${rel} hardcoded ${match[1]}: ${value.slice(0, 80)}`);
  }
  const jsxRe = />([^<>{}]*[A-Za-z][^<>{}]*)</g;
  while ((match = jsxRe.exec(raw))) {
    const value = match[1].trim();
    if (looksEnglish(value)) errors.push(`${rel} hardcoded text: ${value.slice(0, 80)}`);
  }
};

const walkTsx = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'ui') continue;
      walkTsx(full);
    } else if (entry.name.endsWith('.tsx')) {
      scanFile(full);
    }
  }
};

walkTsx(path.join(srcRoot, 'pages'));
walkTsx(path.join(srcRoot, 'components'));

if (errors.length) {
  console.error(errors.slice(0, 80).join('\n'));
  if (errors.length > 80) console.error(`... and ${errors.length - 80} more`);
  console.error(`${errors.length} locale problems`);
  process.exit(1);
}
console.log(`Locale check passed for ${langs.length} languages and ${files.length} namespaces.`);
