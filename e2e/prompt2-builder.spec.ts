import { expect, test } from '@playwright/test';

test('demo teacher runs the 3-topic builder smoke path', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?demo=1');
  await expect(page.getByTestId('demo-badge')).toBeVisible();
  await expect(page.getByTestId('demo-one-tap')).toBeVisible();

  await page.getByTestId('demo-try-teacher').click();
  await page.waitForURL(/\/teacher\/demo/, { timeout: 10_000 });
  await expect(page.getByTestId('pilot-overview')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel('Solar system')).toBeVisible({ timeout: 10_000 });

  await page.getByTestId('open-curriculum').click();
  await expect(page.getByText('Demo path: Count · Add · Subtract')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Smaller steps')).toBeVisible();

  await page.getByTestId('curriculum-build-for-me').click();
  await expect(page.getByTestId('three-topic-wizard')).toBeVisible();

  await page.getByRole('button', { name: 'Counting' }).click();
  await page.getByRole('button', { name: 'Addition' }).click();
  await page.getByRole('button', { name: 'Subtraction' }).click();
  await page.getByTestId('builder-run').click();
  await expect(page.getByTestId('builder-review')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('builder-review').click();

  await expect(page.getByTestId('curriculum-workshop')).toBeVisible();
  await expect(page.getByTestId('curriculum-save')).toBeVisible();
  await expect(page.getByText(/Counting|Addition|Subtraction/i).first()).toBeVisible();
});
