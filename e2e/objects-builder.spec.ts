import { expect, test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePng = path.join(here, 'fixtures', 'object-crayon.png');

test('objects page accepts a file photo for a solo learner', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'better-math:active',
      JSON.stringify({
        classCode: 'solo',
        nickname: 'crayonfox',
        displayName: 'Crayon Fox',
        solo: true,
      })
    );
    localStorage.setItem('better-math:active-role', 'student');
    localStorage.setItem(
      'mathlift:object-prefs.v1',
      JSON.stringify({
        activeId: null,
        showPicturesWithProblems: true,
        grownUpUnlocked: true,
      })
    );
  });

  await page.goto('/objects');
  await expect(page.getByTestId('objects-page')).toBeVisible();
  await page.getByTestId('objects-add').click();
  await expect(page.getByTestId('objects-file-input')).toBeAttached();
  await page.getByTestId('objects-file-input').setInputFiles(fixturePng);
  await expect(page.getByTestId('objects-review')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('objects-looks-good').click();
  await page.getByTestId('objects-name-one').fill('crayon');
  await page.getByTestId('objects-name-many').fill('crayons');
  await page.getByTestId('objects-preview').click();
  await page.getByTestId('objects-save').click();
  await expect(page.getByText(/crayon/i).first()).toBeVisible({ timeout: 10_000 });
});

test('demo teacher can open the 3-topic builder', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.getByTestId('demo-badge')).toBeVisible();
  await page.goto('/teacher/demo/curriculum');
  await expect(page.getByTestId('curriculum-build-for-me')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('curriculum-build-for-me').click();
  await expect(page.getByTestId('three-topic-wizard')).toBeVisible();
  await page.getByRole('button', { name: /^Counting$|^Conteo$|^计数$|^गिनती$|^العد$/i }).click();
  await page.getByRole('button', { name: /^Addition$|^Suma$|^加法$|^जोड़$|^الجمع$/i }).click();
  await page.getByRole('button', { name: /^Subtraction$|^Resta$|^减法$|^घटाव$|^الطرح$/i }).click();
  await page.getByTestId('builder-run').click();
  await expect(page.getByTestId('builder-review')).toBeVisible({ timeout: 20_000 });
});
