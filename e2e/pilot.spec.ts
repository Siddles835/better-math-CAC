import { expect, test } from '@playwright/test';

test('demo mode covers a path, an assessment, a curriculum, a CSV, and a reset', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?demo=1');
  await expect(page.getByTestId('demo-badge')).toBeVisible();
  await expect(page.getByTestId('demo-badge')).toContainText('DEMO DATA');

  await page.getByRole('button', { name: 'New Student (Join Class)' }).click();
  await page.getByLabel('Class Code').fill('demo');
  await page.getByRole('button', { name: 'Join Class' }).click();
  await page.getByTestId('pick-multiplication').click();
  await page.getByTestId('demo-fast-forward').click();
  await expect(page.getByTestId('assessment-result')).toBeVisible();
  await expect(page.getByTestId('assessment-result')).not.toContainText('The answer is');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Multiplication' })).toBeVisible();

  await page.goto('/?demo=1');
  await page.getByRole('button', { name: 'Manage Class (Login)' }).click();
  await page.getByLabel('Class Code').fill('demo');
  await page.getByLabel('Teacher PIN').fill('DEMO01');
  await page.getByRole('button', { name: 'Enter Dashboard' }).click();
  await expect(page.getByTestId('pilot-overview')).toBeVisible();

  await page.getByTestId('open-curriculum').click();
  await page.getByTestId('duplicate-path').selectOption('addition');
  await page.getByTestId('curriculum-save').click();
  await page.getByTestId('assign-class').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('pilot-overview')).toContainText('Addition');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-csv').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^DEMO-/);

  await page.getByTestId('demo-reset').click();
  await expect(page.getByTestId('demo-badge')).toBeVisible();
  await page.goto('/teacher/demo/curriculum');
  await expect(page.getByText('Smaller steps')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(1);
});
