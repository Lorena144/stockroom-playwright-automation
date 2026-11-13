import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

const envPath = resolve(__dirname, '.env');

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const baseURL = process.env.UI_BASE_URL;

if (!baseURL) {
  throw new Error('UI_BASE_URL is missing. Set it in .env or the environment.');
}

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  timeout: 30_000,

  expect: {
    timeout: 5_000,
  },

  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 1 : 2,

  reporter: process.env.CI
    ? [['list']]
    : [['list'], ['html', { open: 'never' }]],

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
