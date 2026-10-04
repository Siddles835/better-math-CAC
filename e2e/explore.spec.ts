import { expect, test } from '@playwright/test';

const ACTIVITIES = [
  'show-me',
  'quick-look',
  'number-talk',
  'wodb',
  'make-ten',
  'number-line',
  'build-story',
  'pattern-skip',
] as const;

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
  await page.setViewportSize({ width: 360, height: 740 });
});

test('Explore hub lists all activities at 360px', async ({ page }) => {
  await page.goto('/explore');
  await expect(page.getByTestId('explore-hub')).toBeVisible();
  for (const id of ACTIVITIES) {
    await expect(page.getByTestId(`explore-link-${id}`)).toBeVisible();
  }
});

for (const id of ACTIVITIES) {
  test(`opens Explore activity ${id} at 360px`, async ({ page }) => {
    await page.goto(`/explore/${id}`);
    await expect(page.getByTestId(`explore-activity-${id}`)).toBeVisible();
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.getByText(/speed score|streak bonus|countdown/i)).toHaveCount(0);
  });
}
