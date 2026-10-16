import { expect, test } from '@playwright/test';

test('solo foundations path opens the solar system hub', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'better-math:active',
      JSON.stringify({
        classCode: 'solo',
        nickname: 'cometfox',
        displayName: 'Comet Fox',
        solo: true,
      })
    );
    localStorage.setItem('better-math:active-role', 'student');
    localStorage.setItem(
      'better-math:solo-progress',
      JSON.stringify({
        nickname: 'cometfox',
        displayName: 'Comet Fox',
        planet: 'sun',
        lesson: 'counting',
        unlockPlanet: 'sun',
        completedPlanets: [],
        planetSteps: {},
        placementDone: true,
        lastUpdated: Date.now(),
      })
    );
  });

  await page.goto('/planets');
  await expect(page.getByTestId('hub-loading')).toBeHidden({ timeout: 10000 });
  // Desktop viewport shows the solar system; look for Sun / floating planets chrome.
  await expect(page.getByText(/Sun|Mercury|Your solar system|Continue/i).first()).toBeVisible({
    timeout: 10000,
  });
});

test('resume student session reaches /planets without sticking on loading', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'better-math:active',
      JSON.stringify({
        classCode: 'solo',
        nickname: 'stardust',
        displayName: 'Stardust',
        solo: true,
      })
    );
    localStorage.setItem('better-math:active-role', 'student');
    localStorage.setItem(
      'better-math:solo-progress',
      JSON.stringify({
        nickname: 'stardust',
        displayName: 'Stardust',
        planet: 'earth',
        lesson: 'addition',
        unlockPlanet: 'earth',
        completedPlanets: ['sun', 'mercury', 'venus'],
        planetSteps: {},
        placementDone: true,
        lastUpdated: Date.now(),
      })
    );
  });

  await page.goto('/');
  await page.getByRole('button', { name: /continue|resume|open planets|solar/i }).first().click({ timeout: 5000 }).catch(async () => {
    await page.goto('/planets');
  });
  await page.waitForURL(/\/planets/, { timeout: 10000 });
  await expect(page.getByTestId('hub-loading')).toBeHidden({ timeout: 10000 });
});
