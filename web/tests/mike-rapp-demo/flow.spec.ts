import { expect, test } from '@playwright/test';

function isInheritedVercelTelemetry(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname === '/_vercel/insights/script.js'
      || (parsed.hostname === 'va.vercel-scripts.com' && parsed.pathname === '/v1/script.debug.js');
  } catch {
    return false;
  }
}

test('Mike can run the sample scan, inspect a lead, preview an alert, and return', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      runtimeErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && !isInheritedVercelTelemetry(response.url())) {
      runtimeErrors.push(`HTTP ${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (!isInheritedVercelTelemetry(request.url())) {
      runtimeErrors.push(`Request failed ${request.url()}`);
    }
  });

  await page.goto('/demo/mike-rapp');

  await expect(page.getByRole('heading', { name: "Mike’s Opportunity Monitor" })).toBeVisible();
  await expect(page.getByText('Personalized demo', { exact: true })).toBeVisible();

  const runButton = page.getByRole('button', { name: 'Run sample scan', exact: true });
  await runButton.click();
  const scanningButton = page.getByRole('button', { name: 'Scanning sample opportunities…', exact: true });
  await expect(scanningButton).toBeDisabled();
  await expect(page.getByRole('status')).toContainText(/Checking sample sources|Organizing listing details/);

  await expect(page.getByText('3 strong matches', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('match-card')).toHaveCount(3);
  await expect(page.getByTestId('filtered-card')).toHaveCount(3);

  await page.getByTestId('match-card').first().getByRole('button', { name: 'Open details' }).click();
  await expect(page.getByRole('dialog', { name: /2004 Chevrolet Tahoe Z71/ })).toBeVisible();
  await expect(page.getByText('Found in this sample scan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to results' }).click();

  await expect(page.getByText('Alert preview—not sent', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preview opportunity details' }).click();
  await expect(page.getByRole('dialog', { name: /2004 Chevrolet Tahoe Z71/ })).toBeVisible();
  await page.getByRole('button', { name: 'Back to results' }).click();
  await expect(page.getByText('3 strong matches', { exact: true })).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});
