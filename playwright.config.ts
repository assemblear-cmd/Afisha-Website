import { defineConfig, devices } from '@playwright/test';

// NOTE: The database must be seeded first (e.g. `npm run db:seed`) before
// running these end-to-end tests, otherwise the app will have no events/users.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 120000,
    // All e2e traffic comes from one IP, so per-IP API limits would make the
    // suite order-dependent. Rate limiting has its own unit tests.
    env: { RATE_LIMIT_DISABLED: '1' },
  },
});
