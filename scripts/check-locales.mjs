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
const allowValues = new Set(['MathLift', 'Devanagari']);
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

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Locale check passed for ${langs.length} languages and ${files.length} namespaces.`);
