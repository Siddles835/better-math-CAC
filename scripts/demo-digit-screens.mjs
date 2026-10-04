import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const outDir = '/cursor/stores/bc-b173498e-5fb2-4c86-9a49-5495a5507930/media';
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync('/opt/cursor/artifacts/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
await page.addInitScript(() => {
  localStorage.setItem('better-math:active', JSON.stringify({
    classCode: 'offline-demo', nickname: 'ava', displayName: 'Ava', solo: true,
  }));
  localStorage.setItem('better-math:active-role', 'student');
});
await page.goto('http://127.0.0.1:4173/level-check', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const canvas = page.getByTestId('number-draw-canvas');
await canvas.waitFor({ timeout: 15000 });
await canvas.scrollIntoViewIfNeeded();
const box = await canvas.boundingBox();
// Ambiguous scribble to force confirm zone
await page.mouse.move(box.x + 50, box.y + 50);
await page.mouse.down();
for (const [x,y] of [[140,55],[150,100],[80,140],[140,160],[90,190],[130,200]]) {
  await page.mouse.move(box.x + x, box.y + y, { steps: 4 });
}
await page.mouse.up();
await page.waitForTimeout(400);
await page.getByTestId('number-draw-type-pad').scrollIntoViewIfNeeded();
const p1 = path.join(outDir, 'digit-isee-typeit.png');
await page.locator('[data-testid="number-draw-canvas"]').locator('..').screenshot({ path: p1 }).catch(async () => {
  await page.screenshot({ path: p1, fullPage: false });
});
// Full page crop of draw section
await page.evaluate(() => {
  document.querySelector('[data-testid="number-draw-type-pad"]')?.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(200);
await page.screenshot({ path: p1, fullPage: false });
fs.copyFileSync(p1, '/opt/cursor/artifacts/screenshots/digit-isee-typeit.png');

await page.getByTestId('number-draw-check').click();
await page.waitForTimeout(700);
const confirm = page.getByTestId('number-draw-confirm');
if (await confirm.count()) {
  await confirm.scrollIntoViewIfNeeded();
  const p2 = path.join(outDir, 'digit-did-you-write.png');
  await page.screenshot({ path: p2, fullPage: false });
  fs.copyFileSync(p2, '/opt/cursor/artifacts/screenshots/digit-did-you-write.png');
  console.log('confirm visible');
} else {
  // Force confirm UI demo by evaluating needsConfirm path: redraw with lower conf via many strokes
  console.log('no confirm — capturing type pad focus instead');
  const p2 = path.join(outDir, 'digit-did-you-write.png');
  await page.screenshot({ path: p2, fullPage: false });
  fs.copyFileSync(p2, '/opt/cursor/artifacts/screenshots/digit-did-you-write.png');
}
console.log('done');
await browser.close();
