import { expect, test, type Locator, type Page } from '@playwright/test';

const screenshotDir = '/tmp/mike-phase2a-visual-qa';

async function signInAndRunFixture(page: Page): Promise<void> {
  await page.goto('/portal/mike-rapp');
  if (await page.getByLabel('Password').isVisible()) {
    await page.getByLabel('Password').fill('local-preview-only');
    await Promise.all([
      page.waitForURL(/\/portal\/mike-rapp$/),
      page.getByRole('button', { name: 'Sign in securely' }).click(),
    ]);
  }
  const fixtureButton = page.getByRole('button', { name: 'Run checked-in fixture' });
  if (await fixtureButton.isVisible()) {
    await fixtureButton.click();
  } else {
    const cookieHeader = (await page.context().cookies())
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');
    const response = await page.request.post('/api/opportunity/mike-rapp/fixture', {
      headers: { origin: new URL(page.url()).origin, cookie: cookieHeader },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(303);
    await page.goto(response.headers().location ?? '/portal/mike-rapp?run=failed');
  }
  await expect(page).toHaveURL(/\/portal\/mike-rapp\?run=complete$/);
}

async function expectAccessibleRuntime(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: "Mike's opportunity workspace" })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  const checks = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    unnamedButtons: [...document.querySelectorAll('button')].filter(
      (button) => !(button.getAttribute('aria-label') || button.textContent?.trim()),
    ).length,
    unlabeledInputs: [...document.querySelectorAll('input:not([type="hidden"]), select')].filter((control) => {
      const id = control.getAttribute('id');
      return !(
        control.getAttribute('aria-label')
        || control.closest('label')
        || (id && document.querySelector(`label[for="${CSS.escape(id)}"]`))
      );
    }).length,
    clippedControls: [...document.querySelectorAll('button, input, select, summary')].filter((control) => {
      const rect = control.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1);
    }).length,
  }));
  expect(checks).toEqual({
    horizontalOverflow: false,
    unnamedButtons: 0,
    unlabeledInputs: 0,
    clippedControls: 0,
  });
  await expect(page.locator('body')).not.toContainText(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  const intakeStatus = page.getByText('Craigslist intake is awaiting protected mailbox configuration in this environment.');
  if (await intakeStatus.isVisible()) {
    expect(await intakeStatus.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, backgroundColor: style.backgroundColor };
    })).toEqual({ color: 'rgb(123, 45, 32)', backgroundColor: 'rgb(255, 241, 237)' });
  }
}

async function expectVisibleTwoToneFocus(control: Locator): Promise<void> {
  await control.focus();
  await expect(control).toBeFocused();
  const focusStyle = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      boxShadow: style.boxShadow,
    };
  });
  expect(focusStyle.outlineStyle).toBe('solid');
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(3);
  expect(focusStyle.boxShadow).not.toBe('none');
}

test('production desktop portal is accessible, error-free, and visually bounded', async ({ page }) => {
  const runtimeErrors: string[] = [];
  const unexpectedHttpErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      runtimeErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().endsWith('/_vercel/insights/script.js')) {
      unexpectedHttpErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signInAndRunFixture(page);
  await expectAccessibleRuntime(page);
  await expectVisibleTwoToneFocus(page.getByRole('button', { name: 'Log out' }));
  await page.screenshot({ path: `${screenshotDir}/portal-desktop.png`, fullPage: true });
  expect(runtimeErrors).toEqual([]);
  expect(unexpectedHttpErrors).toEqual([]);
});

test('production mobile portal avoids clipping and preserves the primary flow', async ({ page }) => {
  const runtimeErrors: string[] = [];
  const unexpectedHttpErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      runtimeErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().endsWith('/_vercel/insights/script.js')) {
      unexpectedHttpErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signInAndRunFixture(page);
  await expectAccessibleRuntime(page);
  await expect(page.getByText('2 source records share this identity')).toBeVisible();
  const fixtureButton = page.getByRole('button', { name: 'Run checked-in fixture' });
  if (await fixtureButton.isVisible()) {
    await expectVisibleTwoToneFocus(fixtureButton);
  } else {
    await expect(fixtureButton).toHaveCount(0);
  }
  await page.screenshot({ path: `${screenshotDir}/portal-mobile.png`, fullPage: true });
  expect(runtimeErrors).toEqual([]);
  expect(unexpectedHttpErrors).toEqual([]);
});
