import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/mike-rapp-phase2a',
  testMatch: ['**/portal-flow.spec.ts', '**/portal-visual.spec.ts'],
  forbidOnly: true,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3111',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-phase2a-production',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'env VERCEL=1 OPPORTUNITY_LOCAL_FIXTURE_TEST=enabled npm run start -- --hostname 127.0.0.1 --port 3111',
    url: 'http://127.0.0.1:3111/portal/login',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
