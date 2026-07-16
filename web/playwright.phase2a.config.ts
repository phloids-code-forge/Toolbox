import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/mike-rapp-phase2a',
  testMatch: ['**/portal-flow.spec.ts'],
  forbidOnly: true,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3110',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-phase2a',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'env -u NODE_ENV VERCEL=1 npm run dev -- --hostname 127.0.0.1 --port 3110',
    url: 'http://127.0.0.1:3110',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
