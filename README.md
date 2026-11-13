# Stockroom Playwright Automation

![CI](https://github.com/Lorena144/stockroom-playwright-automation/actions/workflows/playwright.yml/badge.svg?branch=main)

UI, API and hybrid automation for the Stockroom order and inventory management application,
using Playwright and TypeScript.

**Status:** QA automation portfolio project in progress. New test scenarios are added incrementally.

## Current coverage

- UI: sign-in, form validation, password visibility, sessions, sign-out and access control;
  catalog search, combined filters, sorting, page size, pagination, reset actions,
  refresh persistence, collection scrolling and product details.
- API: authentication, sessions, inventory permissions, CSRF and Origin checks,
  and logout session revocation; catalog search, filters, stock sorting, pagination,
  page size, product details, category counts and query parameter validation;
  rejection of unauthenticated requests to protected endpoints.
- Hybrid: API sign-in followed by browser access; UI sign-in followed by API logout
  and verification that browser access is removed; consistency checks between API
  responses and the UI for category results and product details.

UI and hybrid tests run in Chromium, Firefox and WebKit. API tests run in a separate project.

Catalog tests reuse authenticated storage state per worker.
Browser and API contexts are isolated between tests.

## Setup

Requires Node.js 24 LTS.

```cmd
npm ci
npx playwright install chromium firefox webkit
```

An `.env.example` file lists the required environment variables.
Create your local `.env` file using that template and configure your test accounts.

## Run

Start Stockroom before running the tests.

Check TypeScript:

```cmd
npm run typecheck
```

Run all tests:

```cmd
npm test
```

Run UI or API tests separately:

```cmd
npm run test:ui
npm run test:api
```

Run hybrid tests separately:

```cmd
npm run test:hybrid
```

## Reports

```cmd
npx playwright show-report
```

## CI

GitHub Actions builds a pinned Stockroom version and runs UI, API and hybrid tests.
Credentials are provided through GitHub Secrets.
