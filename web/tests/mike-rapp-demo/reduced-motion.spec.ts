import { expect, test } from '@playwright/test';

test('reduced motion removes decorative motion and finishes the sample scan without delay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demo/mike-rapp');

  const runButton = page.getByRole('button', { name: 'Run sample scan', exact: true });
  const transitionDuration = await runButton.evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transitionDuration).toBe('0s');

  await runButton.click();
  await expect(page.getByText('3 strong matches', { exact: true })).toBeVisible({ timeout: 800 });
});
