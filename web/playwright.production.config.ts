import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3108',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-production',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'env NODE_ENV=production npm run start -- --hostname 127.0.0.1 --port 3108',
    url: 'http://127.0.0.1:3108',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});