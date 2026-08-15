import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

// Read from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './playwright/tests',
  outputDir: './playwright/reports/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45000,
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      threshold: 0.2,
    },
  },

  /* Custom reporting configuration */
  reporter: [
    ['html', { outputFolder: 'playwright/reports/html', open: 'never' }],
    ['json', { outputFile: 'playwright/reports/results.json' }],
    ['junit', { outputFile: 'playwright/reports/results.xml' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'x-playwright-test': 'true',
    },
  },

  /* Configure projects for major browsers and mobile viewports */
  projects: [
    // Desktop Browsers
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'Desktop Firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'Desktop Safari',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'Edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        viewport: { width: 1440, height: 900 },
      },
    },

    // Mobile & Tablet Browsers
    {
      name: 'iPhone',
      use: {
        ...devices['iPhone 14 Pro'],
      },
    },
    {
      name: 'Pixel',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'Samsung',
      use: {
        ...devices['Galaxy S9+'],
        viewport: { width: 360, height: 740 },
      },
    },
    {
      name: 'iPad',
      use: {
        ...devices['iPad Pro 11'],
      },
    },
  ],

  /* Run local dev server before running tests if server isn't running */
  webServer: {
    command: process.env.CI ? `npm run start -- -p ${PORT}` : 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
