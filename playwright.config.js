import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    // Stub camera so tests run without real device
    permissions: ['camera'],
  },
  projects: [
    {
      name: 'iPhone SE',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'iPhone 14',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'iPhone 14 Plus',
      use: {
        ...devices['iPhone 14 Plus'],
        viewport: { width: 430, height: 932 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
