import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve('C:/Users/lalit/Downloads/HTML privacy policy.txt');
const dest = path.resolve(__dirname, '../src/assets/privacy-policy.html');

const ADDENDUM_START = '<!-- mathlift-paths-addendum-start -->';
const ADDENDUM_END = '<!-- mathlift-paths-addendum-end -->';
const ADDENDUM = `${ADDENDUM_START}
<div data-custom-class="body_text">
<h2>Learning paths, assessments, and pilot records</h2>
<p>In addition to planet progress, MathLift may store an optional active path, per-path node progress, and topic counts. Older records without these fields still use planet progress.</p>
<p>An optional level check stores a short summary: recommended path and planet, strengths, and topics to practice. History is capped. The check has no timer and does not show the correct answer.</p>
<p>Foreground time is stored as whole seconds per local day, with an idle cutoff. It is not a speed score.</p>
<p>Teachers may store named curricula, assignments, and an editable goals note. Solo learners are not assigned curricula. Division practice uses exact integer quotients. Algebra practice is one-step equations.</p>
<p>Demo mode keeps a sample class in memory on the device. It does not read or write the class database. Exports from demo mode use a DEMO file name and space names only.</p>
<p>Deleting a student removes their path, assessment, time, and curriculum records. Deleting a class removes curricula and assignments that class owns. A teacher PIN checked in the app is not access control until database rules are deployed.</p>
<p>Last updated October 10, 2026.</p>
</div>
${ADDENDUM_END}`;

const withAddendum = (html) => {
  if (html.includes(ADDENDUM_START) && html.includes(ADDENDUM_END)) {
    return html.replace(new RegExp(`${ADDENDUM_START}[\\s\\S]*?${ADDENDUM_END}`), ADDENDUM);
  }
  return `${html.trim()}\n${ADDENDUM}\n`;
};

if (!fs.existsSync(src)) {
  const existing = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
  const html = withAddendum(existing);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  console.log('Source file missing. Updated the paths addendum in', dest, html.length, 'chars');
  process.exit(0);
}

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

html = withAddendum(html);
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, html.trim());
console.log('Saved', dest, html.length, 'chars');
