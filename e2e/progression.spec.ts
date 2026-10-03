import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'better-math:active',
      JSON.stringify({
        classCode: 'offline-demo',
        nickname: 'ava',
        displayName: 'Ava',
      })
    );
    localStorage.setItem('better-math:active-role', 'student');
  });
});

test('Earth practice again stays on the practice activity', async ({ page }) => {
  await page.goto('/lesson/addition/earth?mlstep=15');
  await page.getByTestId('practice-again').click();
  const practice = page.getByTestId('practice-activity');
  await expect(practice.getByRole('heading', { name: 'Make 6 Pencils' })).toBeVisible();
  await page.waitForTimeout(3000);
  await expect(practice.getByRole('heading', { name: 'Make 6 Pencils' })).toBeVisible();
  await practice.getByTestId('add-pencil').first().click();
  await expect(practice.getByText('3', { exact: true })).toBeVisible();
});

test('Saturn unlocks Uranus and Uranus unlocks Neptune', async ({ page }) => {
  await page.goto('/lesson/subtraction/saturn?mlstep=15');
  await page.getByRole('button', { name: 'Go to Uranus' }).click();
  await page.getByRole('button', { name: 'Go to Uranus' }).click();
  await page.waitForURL(/\/lesson\/subtraction\/uranus/);

  await page.goto('/lesson/subtraction/uranus?mlstep=13');
  await page.getByRole('button', { name: '8', exact: true }).click();
  await page.getByRole('button', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: 'Check Equation' }).click();
  await page.getByRole('button', { name: 'Now Solve It' }).click();
  const pencils = page.getByRole('button', { name: 'Pencil' });
  await pencils.nth(0).click();
  await pencils.nth(1).click();
  await pencils.nth(2).click();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.getByRole('button', { name: 'Go to Neptune' }).click();
  await page.getByRole('button', { name: 'Go to Neptune' }).click();
  await page.waitForURL(/\/lesson\/subtraction\/neptune/);
  await expect(page).toHaveURL(/neptune/);
});
