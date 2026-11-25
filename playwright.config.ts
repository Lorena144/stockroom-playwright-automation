import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import type { ReporterDescription } from '@playwright/test';

const envPath = resolve(__dirname, '.env');

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const baseURL = process.env.UI_BASE_URL;

if (!baseURL) {
  throw new Error('UI_BASE_URL is missing. Set it in .env or the environment.');
}

const allureReporter: ReporterDescription = [
  'allure-playwright',
  {
    resultsDir: 'allure-results',
    detail: false,
  },
];

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  tag: '@regression',

  timeout: 30_000,

  expect: {
    timeout: 5_000,
  },

  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 1 : 1,

  reporter: process.env.CI
    ? [['list'], allureReporter]
    : [['list'], ['html', { open: 'never' }], allureReporter],

  outputDir: 'test-results',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  webServer: process.env.CI
    ? {
      command: 'npm run start',
      cwd: resolve(__dirname, '../application'),
      url: new URL('/api/health', baseURL).href,
      reuseExistingServer: false,
      timeout: 120_000,
    }
    : undefined,

  projects: [
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.ts',
    },
    {
      name: 'chromium',
      testMatch: [
        '**/ui/**/*.spec.ts',
        '**/hybrid/**/*.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox',
      testMatch: [
        '**/ui/**/*.spec.ts',
        '**/hybrid/**/*.spec.ts',
      ],
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      testMatch: [
        '**/ui/**/*.spec.ts',
        '**/hybrid/**/*.spec.ts',
      ],
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],
});
