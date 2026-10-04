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

const evaluate = async (page: Page): Promise<BenchRead & { needsConfirm: boolean }> =>
  page.evaluate(() => {
    const api = (
      window as unknown as {
        __digitBench: {
          evaluate: () => BenchRead;
          needsConfirm: (read: BenchRead) => boolean;
        };
      }
    ).__digitBench;
    const read = api.evaluate();
    return { ...read, needsConfirm: api.needsConfirm(read) };
  });

const clear = async (page: Page) => {
  await page.evaluate(() => {
    (window as unknown as { __digitBench: { clear: () => void } }).__digitBench.clear();
  });
};

test.describe.configure({ mode: 'serial', timeout: 20 * 60_000 });

test('after-model Playwright finger drawings (≥30/digit)', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto('/dev/digit-bench');
  await expect(page.getByTestId('digit-bench')).toBeVisible();
  await page.waitForFunction(() => Boolean((window as unknown as { __digitBench?: unknown }).__digitBench));

  const size = await page.evaluate(() =>
    (
      window as unknown as {
        __digitBench: { canvasSize: () => { width: number; height: number } };
      }
    ).__digitBench.canvasSize()
  );

  type Row = {
    target: number | string;
    variant: string;
    status: string;
    digit: number;
    confidence: number;
    exact: boolean;
    successOrConfirm: boolean;
    silentWrong: boolean;
  };
  const rows: Row[] = [];

  for (let digit = 0; digit <= 9; digit++) {
    for (let vi = 0; vi < VARIANTS.length; vi++) {
      const variant = VARIANTS[vi];
      const strokes = toCanvasCoords(transformDigit(digit, variant, 2000 + digit * 100 + vi), size.width, size.height);
      await clear(page);
      await drawStrokes(page, strokes, variant.speed);
      const read = await evaluate(page);
      const exact = read.status === 'ok' && read.digit === digit;
      // Prompt gate: read correctly OR reach the confirm step.
      const successOrConfirm = exact || (read.status === 'ok' && read.needsConfirm);
      // Silent wrong = accepted as a definite wrong digit with no confirm.
      const silentWrong = read.status === 'ok' && read.digit !== digit && !read.needsConfirm;
      rows.push({
        target: digit,
        variant: variant.label,
        status: read.status,
        digit: read.digit,
        confidence: read.confidence,
        exact,
        successOrConfirm,
        silentWrong,
      });
    }
  }

  for (const value of MULTI_VALUES) {
    for (let vi = 0; vi < 12; vi++) {
      const variant = VARIANTS[vi];
      const strokes = toCanvasCoords(multiDigitStrokes(value, variant, 9000 + value * 10 + vi), size.width, size.height);
      await clear(page);
      await drawStrokes(page, strokes, variant.speed);
      const read = await evaluate(page);
      const exact = read.status === 'ok' && read.digit === value;
      const successOrConfirm = exact || (read.status === 'ok' && read.needsConfirm);
      rows.push({
        target: value,
        variant: variant.label,
        status: read.status,
        digit: read.digit,
        confidence: read.confidence,
        exact,
        successOrConfirm,
        silentWrong: read.status === 'ok' && read.digit !== value && !read.needsConfirm,
      });
    }
  }

  const perDigit: Record<string, { n: number; exact: number; okOrConfirm: number; silentWrong: number; rate: number }> = {};
  for (let d = 0; d <= 9; d++) {
    const subset = rows.filter((r) => r.target === d);
    const promptPass = subset.filter((r) => r.successOrConfirm).length;
    perDigit[String(d)] = {
      n: subset.length,
      exact: subset.filter((r) => r.exact).length,
      okOrConfirm: promptPass,
      silentWrong: subset.filter((r) => r.silentWrong).length,
      rate: promptPass / subset.length,
    };
  }

  const multi: Record<string, { n: number; exact: number; rate: number; silentWrong: number }> = {};
  for (const value of MULTI_VALUES) {
    const subset = rows.filter((r) => r.target === value);
    const promptPass = subset.filter((r) => r.successOrConfirm).length;
    multi[String(value)] = {
      n: subset.length,
      exact: subset.filter((r) => r.exact).length,
      rate: promptPass / subset.length,
      silentWrong: subset.filter((r) => r.silentWrong).length,
    };
  }

  const single = rows.filter((r) => typeof r.target === 'number' && (r.target as number) <= 9);
  const singleRate = single.filter((r) => r.successOrConfirm).length / single.length;
  const silentWrongTotal = rows.filter((r) => r.silentWrong).length;

  const summary = {
    phase: 'after_model_change',
    generatedAt: new Date().toISOString(),
    singleDigitGateRate: singleRate,
    silentWrongTotal,
    perDigit,
    multi,
  };

  const outDir = path.resolve('ml/reports');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'after_finger_playwright.json'), JSON.stringify({ summary, rows }, null, 2));

  console.log('\n=== AFTER Playwright finger-draw per-digit table ===');
  console.log('digit | n | exact | ok_or_confirm_path | silent_wrong | gate_rate');
  for (let d = 0; d <= 9; d++) {
    const s = perDigit[String(d)];
    console.log(`${d} | ${s.n} | ${s.exact} | ${s.okOrConfirm} | ${s.silentWrong} | ${(s.rate * 100).toFixed(1)}%`);
  }
  console.log('multi | n | exact | gate_rate | silent_wrong');
  for (const value of MULTI_VALUES) {
    const s = multi[String(value)];
    console.log(`${value} | ${s.n} | ${s.exact} | ${(s.rate * 100).toFixed(1)}% | ${s.silentWrong}`);
  }
  console.log(`single gate rate: ${(singleRate * 100).toFixed(1)}% silentWrong=${silentWrongTotal}`);

  for (let d = 0; d <= 9; d++) expect(perDigit[String(d)].n).toBeGreaterThanOrEqual(30);
  expect(singleRate).toBeGreaterThanOrEqual(0.95);
  expect(silentWrongTotal).toBe(0);
  for (const value of MULTI_VALUES) {
    expect(multi[String(value)].rate).toBeGreaterThanOrEqual(0.9);
  }
});
