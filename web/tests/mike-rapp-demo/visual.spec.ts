import { expect, test } from '@playwright/test';

const demoPath = '/demo/mike-rapp';

function watchRuntimeErrors(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('/_vercel/insights/script.js')) {
      errors.push(`HTTP ${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (!request.url().includes('/_vercel/insights/script.js')) {
      errors.push(`Request failed ${request.url()}`);
    }
  });
  return errors;
}

test('desktop demo has no overflow, hides unrelated site doodads, and captures the completed flow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = watchRuntimeErrors(page);

  await page.goto(demoPath);
  await expect(page.getByRole('heading', { name: 'Mike’s Opportunity Monitor' })).toBeVisible();
  await expect(page.locator('body > a[href="https://ko-fi.com/phloid"]')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/mike-rapp-desktop-1440x900.png' });

  await page.getByRole('button', { name: 'Run sample scan', exact: true }).click();
  await expect(page.getByText('3 strong matches', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ fullPage: true, path: 'test-results/mike-rapp-desktop-complete-full.png' });

  await page.getByTestId('match-card').first().getByRole('button', { name: 'Open details' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/mike-rapp-desktop-detail-1440x900.png' });
});

test('mobile demo and detail stay within 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = watchRuntimeErrors(page);

  await page.goto(demoPath);
  await page.getByRole('button', { name: 'Run sample scan', exact: true }).click();
  await expect(page.getByText('3 strong matches', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= 390)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ fullPage: true, path: 'test-results/mike-rapp-mobile-complete-390x844.png' });

  await page.getByTestId('match-card').first().getByRole('button', { name: 'Open details' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= 390)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/mike-rapp-mobile-detail-390x844.png' });
});

test('primary flow is keyboard reachable and the detail returns focusably to results', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(demoPath);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Back to top' })).toBeFocused();
  await page.keyboard.press('Tab');
  const runButton = page.getByRole('button', { name: 'Run sample scan', exact: true });
  await expect(runButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('3 strong matches', { exact: true })).toBeVisible();

  await page.keyboard.press('Tab');
  const firstDetailButton = page.getByTestId('match-card').first().getByRole('button', { name: 'Open details' });
  await expect(firstDetailButton).toBeFocused();
  await page.keyboard.press('Enter');
  const backButton = page.getByRole('button', { name: 'Back to results' });
  await expect(backButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('3 strong matches', { exact: true })).toBeVisible();
});

test('protected root and Weather Wars routes still render without browser errors', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = watchRuntimeErrors(page);

  const rootResponse = await page.goto('/');
  expect(rootResponse?.ok()).toBe(true);
  await expect(page.getByText('WEATHER WARS', { exact: true })).toBeVisible();
  await page.waitForTimeout(800);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/protected-root-1440x900.png' });

  const weatherResponse = await page.goto('/weatherwars');
  expect(weatherResponse?.ok()).toBe(true);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByText('Weather Wars // Battle for Accuracy', { exact: true })).toBeVisible({ timeout: 10_000 });
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/protected-weatherwars-1440x900.png' });
});
