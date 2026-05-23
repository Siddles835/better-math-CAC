import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dest = path.resolve(__dirname, '../src/assets/privacy-policy.html');

let html = fs.readFileSync(dest, 'utf8');

const h2Start = html.indexOf('<h2>11. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>');
const h2End = html.indexOf('<h2>12. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</h2>');

if (h2Start === -1 || h2End === -1 || h2End <= h2Start) {
  console.error('Could not locate sections 11 and 12');
  process.exit(1);
}

const start = html.lastIndexOf('<div style="line-height: 1.5;">', h2Start);
const end = html.lastIndexOf('<div id="request"', h2End);
const blockEnd = end;

if (start === -1 || blockEnd === -1 || blockEnd <= start) {
  console.error('Could not locate section 11 block boundaries', { start, blockEnd });
  process.exit(1);
}

const section11Html =
  '<div style="line-height: 1.5;"><span style="color: rgb(127, 127, 127);"><span style="color: rgb(89, 89, 89); font-size: 15px;"><span style="font-size: 15px; color: rgb(89, 89, 89);"><span style="font-size: 15px; color: rgb(89, 89, 89);"><span id="control" style="color: rgb(0, 0, 0);"><strong><span data-custom-class="heading_1"><h2>11. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2></span></strong></span></span></span></span></span></div>' +
  '<div style="line-height: 1.5;"><span style="font-size: 15px; color: rgb(89, 89, 89);"><span data-custom-class="body_text">If you have questions or comments about this notice, you may email us at <a target="_blank" data-custom-class="link" href="mailto:mathlift1234@gmail.com">mathlift1234@gmail.com</a>.</span></span></div>';

html = html.slice(0, start) + section11Html + html.slice(blockEnd);

fs.writeFileSync(dest, html);
console.log('Updated section 11');
