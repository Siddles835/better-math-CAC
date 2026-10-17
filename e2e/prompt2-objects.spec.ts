import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const fixturePng = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'pencil.png');

test('objects page accepts a file-input photo and saves a sticker', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?demo=1');
  await expect(page.getByTestId('demo-badge')).toBeVisible();
  await page.getByTestId('demo-try-teacher').click();
  await page.waitForURL(/\/teacher\/demo/, { timeout: 10_000 });

  await page.goto('/objects');
  await expect(page.getByTestId('objects-page')).toBeVisible();

  await page.getByTestId('objects-add').click();
  await expect(page.getByTestId('objects-capture')).toBeVisible({ timeout: 10_000 });

  // Prefer file input over camera for reliability (fake media stream flags are also set).
  await page.getByTestId('objects-file-input').setInputFiles(fixturePng);
  await expect(page.getByTestId('objects-review')).toBeVisible({ timeout: 20_000 });

  await page.getByTestId('objects-looks-good').click();
  await page.getByTestId('objects-name-one').fill('pencil');
  await page.getByTestId('objects-name-many').fill('pencils');
  await page.getByTestId('objects-preview').click();
  await page.getByTestId('objects-save').click();

  await expect(page.getByTestId('objects-page')).toBeVisible();
  await expect(page.getByText('pencil').first()).toBeVisible({ timeout: 10_000 });
});
