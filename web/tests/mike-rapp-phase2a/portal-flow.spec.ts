import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { applyOpportunityMigrations } from '../../src/lib/opportunity/migrations';
import { seedMikeStarterWatches } from '../../src/lib/opportunity/seed';

const databaseUrl = process.env.POSTGRES_URL ?? '';

test.beforeAll(async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)`,
      ['mike-rapp'],
    );
    await pool.query(
      `DELETE FROM opportunity_source_records
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)`,
      ['mike-rapp'],
    );
    await pool.query(
      `DELETE FROM opportunity_duplicate_groups
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)`,
      ['mike-rapp'],
    );
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)`,
      ['mike-rapp'],
    );
    await pool.query(
      `DELETE FROM opportunity_login_rate_limits
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)`,
      ['mike-rapp'],
    );
  } finally {
    await pool.end();
  }
});

test('protected Mike navigation binds ownership and logout clears access', async ({ page }) => {
  await page.goto('/portal/mike-rapp');

  await expect(page).toHaveURL(/\/portal\/login\?next=%2Fportal%2Fmike-rapp$/);
  await expect(page.getByRole('heading', { name: 'Private opportunity workspace' })).toBeVisible();

  await page.getByLabel('Password').fill('local-preview-only');
  await page.getByRole('button', { name: 'Sign in securely' }).click();

  await expect(page).toHaveURL(/\/portal\/mike-rapp$/);
  await expect(page.getByRole('heading', { name: "Mike's opportunity workspace" })).toBeVisible();
  await expect(page.getByText('Authenticated for Mike Rapp')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hosted Craigslist intake' })).toBeVisible();
  await expect(page.getByText('Craigslist saved-search intake only · alert provider disabled · nothing queued, sent, or delivered')).toBeVisible();

  await page.goto('/portal/synthetic-other-client');
  await expect(page).toHaveURL(/\/portal\/login\?next=%2Fportal%2Fsynthetic-other-client$/);
  await expect(page.getByText('That workspace does not match this signed session.')).toBeVisible();

  await page.goto('/portal/mike-rapp');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/portal\/login\?next=%2Fportal%2Fmike-rapp$/);

  await page.goto('/portal/mike-rapp');
  await expect(page).toHaveURL(/\/portal\/login\?next=%2Fportal%2Fmike-rapp$/);
  await expect(page.getByRole('heading', { name: "Mike's opportunity workspace" })).toHaveCount(0);
});

test('fixture run renders durable decisions, duplicate history, and truthful alert state', async ({ page }) => {
  await page.goto('/portal/mike-rapp');
  await page.getByLabel('Password').fill('local-preview-only');
  await page.getByRole('button', { name: 'Sign in securely' }).click();
  await page.getByRole('button', { name: 'Run checked-in fixture' }).click();

  await expect(page).toHaveURL(/\/portal\/mike-rapp\?run=complete$/);
  await expect(page.getByRole('heading', { name: 'Durable opportunity decisions' })).toBeVisible();
  await expect(page.getByText('2011 Toyota Land Cruiser · clean Georgia title')).toBeVisible();
  await expect(page.getByText('2 source records share this identity')).toBeVisible();
  await expect(page.getByText('Skipped — provider disabled').first()).toBeVisible();
  await expect(page.getByText('First seen').first()).toBeVisible();
  await expect(page.getByText('Last seen').first()).toBeVisible();
  await expect(page.getByText('Year is not confirmed').first()).toBeVisible();
  await expect(page.getByText('Fixture source completed')).toBeVisible();
});

test('invalid watch mutation is rejected on the server without changing the watch', async ({ page }) => {
  await page.goto('/portal/mike-rapp');
  await page.getByLabel('Password').fill('local-preview-only');
  await page.getByRole('button', { name: 'Sign in securely' }).click();
  await page.getByRole('button', { name: 'Edit Toyota Land Cruiser watch' }).click();
  await page.getByLabel('Starting year for Toyota Land Cruiser').fill('2030');
  await page.getByLabel('Ending year for Toyota Land Cruiser').fill('2000');
  await page.getByRole('button', { name: 'Save Toyota Land Cruiser watch' }).click();

  await expect(page).toHaveURL(/\/portal\/mike-rapp\?watch=invalid$/);
  await expect(page.getByRole('alert').filter({ hasText: 'Watch was not changed.' })).toHaveText(
    'Watch was not changed. Check the year, price, mileage, and status ranges.',
  );
  await expect(page.getByLabel('Starting year for Toyota Land Cruiser')).toHaveValue('2008');
  await expect(page.getByLabel('Ending year for Toyota Land Cruiser')).toHaveValue('2015');
});

test('valid watch creation is server-validated and client-scoped', async ({ page }) => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const title = 'Synthetic Bronco draft watch';

  try {
    await pool.query(
      `DELETE FROM opportunity_watches
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND title = $2`,
      ['mike-rapp', title],
    );
    await page.goto('/portal/mike-rapp');
    await page.getByLabel('Password').fill('local-preview-only');
    await page.getByRole('button', { name: 'Sign in securely' }).click();
    await page.getByRole('button', { name: 'Add a draft watch' }).click();
    await page.getByLabel('New watch title').fill(title);
    await page.getByLabel('New watch search terms').fill('Ford Bronco');
    await page.getByLabel('New watch starting year').fill('1978');
    await page.getByLabel('New watch ending year').fill('1996');
    await page.getByLabel('New watch maximum mileage').fill('200000');
    await page.getByRole('button', { name: 'Create validated watch' }).click();

    await expect(page).toHaveURL(/\/portal\/mike-rapp\?watch=created$/);
    await expect(page.getByRole('status')).toHaveText('Draft watch created with server validation.');
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    const createdCard = page.getByRole('article').filter({
      has: page.getByRole('heading', { name: title }),
    });
    await createdCard.getByRole('button', { name: `Edit ${title}` }).click();
    await createdCard.getByLabel('Status').selectOption('active');
    await createdCard.getByRole('button', { name: `Save ${title}` }).click();
    await expect(page).toHaveURL(/\/portal\/mike-rapp\?watch=invalid$/);
    await expect(page.getByRole('alert').filter({ hasText: 'Watch was not changed.' })).toBeVisible();
    await expect(page.getByRole('article').filter({ hasText: title }).getByText('draft', { exact: true })).toBeVisible();
  } finally {
    await pool.query(
      `DELETE FROM opportunity_watches
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND title = $2`,
      ['mike-rapp', title],
    );
    await pool.end();
  }
});

test('login route returns a retry boundary after bounded failures', async ({ request }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  const headers = {
    origin,
    'x-vercel-forwarded-for': '198.51.100.44',
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await request.post('/api/opportunity/session', {
      form: { next: '/portal/mike-rapp', password: 'synthetic-wrong-password' },
      headers,
      maxRedirects: 0,
    });
    expect(response.status()).toBe(303);
    expect(response.headers().location).toContain('error=invalid');
  }

  const blocked = await request.post('/api/opportunity/session', {
    form: { next: '/portal/mike-rapp', password: 'synthetic-wrong-password' },
    headers,
    maxRedirects: 0,
  });
  expect(blocked.status()).toBe(303);
  expect(blocked.headers().location).toContain('error=rate_limited');
  expect(Number(blocked.headers()['retry-after'])).toBeGreaterThan(0);
});
