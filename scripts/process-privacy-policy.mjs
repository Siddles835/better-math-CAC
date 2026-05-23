import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve('C:/Users/lalit/Downloads/HTML privacy policy.txt');
const dest = path.resolve(__dirname, '../src/assets/privacy-policy.html');

let html = fs.readFileSync(src, 'utf8');

html = html.replace(/<span style="display: block;margin: 0 auto[\s\S]*?<\/span>\s*/i, '');
html = html.replace(/<bdt class="question">__________<\/bdt>/g, '');
// Contact block: drop empty street line; keep state + country only
html = html.replace(
  /(<bdt class="question noTranslate">MathLift<\/bdt>)([\s\S]*?)(<bdt class="question">United States<\/bdt>)/,
  '$1, $3'
);
html = html.replace(/,\s*,/g, ',');
html = html.replace(/MathLIft\)/g, 'MathLift');
html = html.replace(/better-math-lalith-main\.vercel\.app/g, 'better-math-lalith.vercel.app');

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, html.trim());
console.log('Saved', dest, html.length, 'chars');
