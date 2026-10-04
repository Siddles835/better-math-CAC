import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  MULTI_VALUES,
  VARIANTS,
  multiDigitStrokes,
  toCanvasCoords,
  transformDigit,
  type PathStroke,
} from './digitFingerPaths';

type BenchRead = {
  status: 'ok' | 'unreadable';
  digit: number;
  confidence: number;
  reason?: string;
};

const drawStrokes = async (page: Page, strokes: PathStroke[], speedMs: number) => {
  const canvas = page.getByTestId('digit-bench-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas missing');
  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    const first = stroke[0];
    await page.mouse.move(box.x + first.x, box.y + first.y);
    await page.mouse.down();
    // Subsample move events for speed variation without making the suite hours-long.
    const stride = speedMs >= 20 ? 1 : speedMs >= 12 ? 2 : 3;
    for (let i = 1; i < stroke.length; i += stride) {
      await page.mouse.move(box.x + stroke[i].x, box.y + stroke[i].y, { steps: 1 });
    }
    const last = stroke[stroke.length - 1];
    await page.mouse.move(box.x + last.x, box.y + last.y, { steps: 1 });
    await page.mouse.up();
    await page.waitForTimeout(Math.min(8, Math.max(2, Math.floor(speedMs / 4))));
  }
};

const evaluate = async (page: Page): Promise<BenchRead> =>
  page.evaluate(() => {
    const api = (window as unknown as { __digitBench: { evaluate: () => BenchRead } }).__digitBench;
    return api.evaluate();
  });

const clear = async (page: Page) => {
  await page.evaluate(() => {
    (window as unknown as { __digitBench: { clear: () => void } }).__digitBench.clear();
  });
};

test.describe.configure({ mode: 'serial', timeout: 20 * 60_000 });

test('baseline finger drawings before model changes (≥30/digit)', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto('/dev/digit-bench');
  await expect(page.getByTestId('digit-bench')).toBeVisible();
  await page.waitForFunction(() => Boolean((window as unknown as { __digitBench?: unknown }).__digitBench));

  const size = await page.evaluate(() =>
    (window as unknown as { __digitBench: { canvasSize: () => { width: number; height: number } } }).__digitBench.canvasSize()
  );

  type Row = {
    target: number | string;
    variant: string;
    status: string;
    digit: number;
    confidence: number;
    success: boolean;
    confirmEligible: boolean;
    strokeCount: number;
  };
  const rows: Row[] = [];

  for (let digit = 0; digit <= 9; digit++) {
    for (let vi = 0; vi < VARIANTS.length; vi++) {
      const variant = VARIANTS[vi];
      const strokes = toCanvasCoords(transformDigit(digit, variant, 1000 + digit * 100 + vi), size.width, size.height);
      await clear(page);
      await drawStrokes(page, strokes, variant.speed);
      const strokeCount = await page.evaluate(
        () => (window as unknown as { __digitBench: { getStrokes: () => unknown[] } }).__digitBench.getStrokes().length
      );
      const read = await evaluate(page);
      const confirmEligible = read.status === 'ok'; // confirm step can catch ok-but-uncertain
      const success = read.status === 'ok' && read.digit === digit;
      rows.push({
        target: digit,
        variant: variant.label,
        status: read.status,
        digit: read.digit,
        confidence: read.confidence,
        success,
        confirmEligible,
        strokeCount,
      });
    }
  }

  for (const value of MULTI_VALUES) {
    for (let vi = 0; vi < 12; vi++) {
      const variant = VARIANTS[vi];
      const strokes = toCanvasCoords(multiDigitStrokes(value, variant, 5000 + value * 10 + vi), size.width, size.height);
      await clear(page);
      await drawStrokes(page, strokes, variant.speed);
      const strokeCount = await page.evaluate(
        () => (window as unknown as { __digitBench: { getStrokes: () => unknown[] } }).__digitBench.getStrokes().length
      );
      const read = await evaluate(page);
      const success = read.status === 'ok' && read.digit === value;
      rows.push({
        target: value,
        variant: variant.label,
        status: read.status,
        digit: read.digit,
        confidence: read.confidence,
        success,
        confirmEligible: read.status === 'ok',
        strokeCount,
      });
    }
  }

  const perDigit: Record<string, { n: number; ok: number; unreadable: number; wrong: number; rate: number }> = {};
  for (let d = 0; d <= 9; d++) {
    const subset = rows.filter((r) => r.target === d);
    const ok = subset.filter((r) => r.success).length;
    const unreadable = subset.filter((r) => r.status === 'unreadable').length;
    const wrong = subset.filter((r) => r.status === 'ok' && !r.success).length;
    perDigit[String(d)] = { n: subset.length, ok, unreadable, wrong, rate: ok / subset.length };
  }
  const multi: Record<string, { n: number; ok: number; rate: number }> = {};
  for (const value of MULTI_VALUES) {
    const subset = rows.filter((r) => r.target === value);
    const ok = subset.filter((r) => r.success).length;
    multi[String(value)] = { n: subset.length, ok, rate: ok / subset.length };
  }

  const singleRows = rows.filter((r) => typeof r.target === 'number' && (r.target as number) <= 9);
  const singleOk = singleRows.filter((r) => r.success).length;
  const summary = {
    phase: 'baseline_before_model_change',
    generatedAt: new Date().toISOString(),
    variantsPerDigit: VARIANTS.length,
    singleDigitSuccessRate: singleOk / singleRows.length,
    perDigit,
    multi,
    note: 'Success = status ok AND digit matches. Confirm-eligible ok reads are counted as success only when digit matches (baseline model accuracy).',
  };

  const outDir = path.resolve('ml/reports');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'baseline_finger_playwright.json'), JSON.stringify({ summary, rows }, null, 2));

  // Print the per-digit table for the log / FINAL REPORT.
  console.log('\n=== BASELINE Playwright finger-draw per-digit success table ===');
  console.log('digit | n | ok | unreadable | wrong | rate');
  for (let d = 0; d <= 9; d++) {
    const s = perDigit[String(d)];
    console.log(`${d} | ${s.n} | ${s.ok} | ${s.unreadable} | ${s.wrong} | ${(s.rate * 100).toFixed(1)}%`);
  }
  console.log('multi | n | ok | rate');
  for (const value of MULTI_VALUES) {
    const s = multi[String(value)];
    console.log(`${value} | ${s.n} | ${s.ok} | ${(s.rate * 100).toFixed(1)}%`);
  }
  console.log(`overall single-digit: ${(summary.singleDigitSuccessRate * 100).toFixed(1)}% (${singleOk}/${singleRows.length})`);
  console.log('Wrote ml/reports/baseline_finger_playwright.json');

  // Baseline must actually run (≥30 per digit). Do not assert high accuracy yet.
  for (let d = 0; d <= 9; d++) {
    expect(perDigit[String(d)].n).toBeGreaterThanOrEqual(30);
  }
});
