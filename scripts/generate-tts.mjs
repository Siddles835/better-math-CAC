#!/usr/bin/env node
/**
 * Dev-only: pre-render fixed app speech with Google Cloud Chirp 3 HD.
 * Never bundled into the client. Credentials come from the environment only.
 *
 * Usage:
 *   npm run generate:tts -- --dry-run
 *   GOOGLE_APPLICATION_CREDENTIALS=./keys/tts.json npm run generate:tts
 *
 * Env:
 *   GOOGLE_APPLICATION_CREDENTIALS  path to a service account JSON
 *   GOOGLE_TTS_API_KEY              optional API key alternative
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'tts.config.json'), 'utf8'));
const dryRun = process.argv.includes('--dry-run');
const langs = ['en', 'es', 'hi', 'zh-Hans', 'ar'];
const outDir = path.join(root, 'public', 'audio');
const manifestPath = path.join(outDir, 'manifest.json');

const LOCALES = {
  en: 'en',
  es: 'es',
  hi: 'hi',
  'zh-Hans': 'zh-Hans',
  ar: 'ar',
};

const loadJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

/** Minimal mirror of normalizeSpeechText number words for cost estimation of fixed strings. */
const collectFixedStrings = () => {
  const byLang = Object.fromEntries(langs.map((lang) => [lang, new Set()]));
  const namespaces = ['ui', 'paths', 'common', 'settings', 'explore', 'diagnosis'];
  for (const lang of langs) {
    for (const ns of namespaces) {
      const file = path.join(root, 'src', 'locales', lang, `${ns}.json`);
      if (!fs.existsSync(file)) continue;
      const data = loadJson(path.relative(root, file));
      for (const value of Object.values(data)) {
        if (typeof value === 'string' && value.trim()) byLang[lang].add(value.trim());
      }
    }
  }
  // Number words 0 to 100 and connectives.
  const connectives = {
    en: ['plus', 'minus', 'equals', 'equals what?', 'to', 'point', 'slash', 'over', 'one half'],
    es: ['más', 'menos', 'es igual a', 'cuánto es', 'a', 'punto', 'barra', 'sobre', 'un medio'],
    hi: ['जमा', 'में से घटाओ', 'बराबर', 'कितने', 'से', 'दशमलव', 'स्लैश', 'बटे', 'आधा'],
    'zh-Hans': ['加', '减', '等于', '等于几', '到', '点', '斜杠', '二分之一'],
    ar: ['زائد', 'ناقص', 'يساوي', 'يساوي كم', 'إلى', 'فاصلة', 'شرطة مائلة', 'على', 'نصف'],
  };
  for (const lang of langs) {
    for (let n = 0; n <= 100; n += 1) byLang[lang].add(String(n));
    for (const word of connectives[lang] ?? []) byLang[lang].add(word);
    for (let n = 1; n <= 20; n += 1) {
      byLang[lang].add(`How many are there? ${n}`);
      byLang[lang].add(`Count to ${n}`);
    }
  }
  return byLang;
};

const hashKey = (lang, voice, rate, text) =>
  crypto.createHash('sha1').update(`${lang}|${voice}|${rate}|${text}`).digest('hex');

const estimateCost = (chars) => (chars / 1_000_000) * (config.pricePerMillionCharsUsd ?? 30);

const ensureDirs = () => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const lang of langs) fs.mkdirSync(path.join(outDir, lang), { recursive: true });
};

const callGoogleTts = async (text, voiceName) => {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  const body = {
    input: { text },
    voice: { languageCode: voiceName.slice(0, voiceName.indexOf('-', 3) > 0 ? 5 : 5), name: voiceName },
    audioConfig: {
      audioEncoding: config.audioEncoding || 'MP3',
      speakingRate: config.speakingRate ?? 0.9,
      sampleRateHertz: config.sampleRateHertz ?? 24000,
    },
  };
  // languageCode from voice name prefix (en-US, es-US, hi-IN, cmn-CN, ar-XA)
  const langCode = voiceName.split('-').slice(0, 2).join('-');
  body.voice.languageCode = langCode;

  if (apiKey) {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!response.ok) throw new Error(`TTS API ${response.status}: ${await response.text()}`);
    const json = await response.json();
    return Buffer.from(json.audioContent, 'base64');
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_TTS_API_KEY');
  }
  // Lazy-load google-auth only when generating for real.
  const { GoogleAuth } = await import('google-auth-library').catch(() => {
    throw new Error(
      'Install google-auth-library (npm i -D google-auth-library) or use GOOGLE_TTS_API_KEY'
    );
  });
  const auth = new GoogleAuth({
    keyFile: credPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.token ?? token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`TTS API ${response.status}: ${await response.text()}`);
  const json = await response.json();
  return Buffer.from(json.audioContent, 'base64');
};

const main = async () => {
  ensureDirs();
  const byLang = collectFixedStrings();
  let totalChars = 0;
  let toGenerate = 0;
  let skipped = 0;
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : {};

  const jobs = [];
  for (const lang of langs) {
    const voice = config.voices[lang] || config.voices.en;
    const rate = config.speakingRate ?? 0.9;
    for (const text of byLang[lang]) {
      // Runtime hashes normalized text; for fixed UI strings we hash the raw
      // locale string after a light whitespace normalize (generate with the same
      // text the app will normalize at speak time when possible).
      const normalized = text.replace(/\s+/g, ' ').trim();
      if (!normalized) continue;
      totalChars += normalized.length;
      const key = hashKey(lang, 'chirp3', rate, normalized);
      const fileRel = `${lang}/${key}.mp3`;
      const fileAbs = path.join(outDir, fileRel);
      if (fs.existsSync(fileAbs) && manifest[key]) {
        skipped += 1;
        continue;
      }
      toGenerate += 1;
      jobs.push({ lang, voice, rate, normalized, key, fileRel, fileAbs });
    }
  }

  const cost = estimateCost(jobs.reduce((sum, job) => sum + job.normalized.length, 0));
  console.log(`Languages: ${langs.join(', ')}`);
  console.log(`Unique strings scanned: ${langs.reduce((n, lang) => n + byLang[lang].size, 0)}`);
  console.log(`Character count (to generate): ${jobs.reduce((sum, job) => sum + job.normalized.length, 0)}`);
  console.log(`Estimated cost (Chirp 3 HD ~$${config.pricePerMillionCharsUsd}/1M): $${cost.toFixed(4)}`);
  console.log(`Clips to generate: ${toGenerate}; already present: ${skipped}`);
  console.log(`Total chars across all strings (including existing): ${totalChars}`);

  if (dryRun) {
    console.log('Dry run only. No API calls.');
    return;
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_TTS_API_KEY) {
    console.error('Refusing to call the API without credentials. Use --dry-run or set env credentials.');
    process.exit(1);
  }

  let done = 0;
  for (const job of jobs) {
    const audio = await callGoogleTts(job.normalized, job.voice);
    fs.writeFileSync(job.fileAbs, audio);
    manifest[job.key] = { file: `/audio/${job.fileRel}`, lang: job.lang, voice: 'chirp3', rate: job.rate };
    done += 1;
    if (done % 25 === 0) {
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`Wrote ${done}/${jobs.length}`);
    }
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Done. Manifest at ${manifestPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
