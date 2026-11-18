# Stockroom Playwright Automation

![CI](https://github.com/Lorena144/stockroom-playwright-automation/actions/workflows/playwright.yml/badge.svg?branch=main)

UI, API and hybrid automation for the Stockroom order and inventory management application,
using Playwright and TypeScript.

**Status:** QA automation portfolio project in progress. New test scenarios are added incrementally.

## Current coverage

- UI: sign-in, form validation, password visibility, sessions, sign-out and access control;
  catalog search, combined filters, sorting, page size, pagination, reset actions,
  refresh persistence, collection scrolling and product details;
  cart additions, quantity updates, removals, validation and persistence;
  order placement, confirmation and history;
  mocked history responses, retry handling and recovery from a lost order confirmation response.
- API: authentication, sessions, inventory permissions, CSRF and Origin checks,
  and logout session revocation; catalog search, filters, stock sorting, pagination,
  page size, product details, category counts and query parameter validation;
  rejection of unauthenticated requests to protected endpoints.
- Hybrid: API sign-in followed by browser access; UI sign-in followed by API logout
  and verification that browser access is removed; consistency checks between API
  responses and the UI for category results and product details.

UI and hybrid tests run in Chromium, Firefox and WebKit. API tests run in a separate project.

Catalog, cart and order tests reuse authenticated storage state per worker.
Browser and API contexts are isolated between tests, while application data is shared.
Tests run with one worker to avoid interference between tests using shared demo accounts.

## Setup

Requires Node.js 24 LTS.

```cmd
npm ci
npx playwright install chromium firefox webkit
```

An `.env.example` file lists the required environment variables.
Create your local `.env` file using that template and configure your test accounts.

Clone the [Stockroom application](https://github.com/Lorena144/stockroom-application)
into a sibling folder named `application`. Follow its README to initialize the demo
data and start the application at `http://127.0.0.1:3000`.

Order tests require this local checkout to restore product stock after each test.

## Test data

Cart tests clear the cart before and after each test.
The order fixture restores the product stock recorded before each test.

<details>
<summary>Troubleshooting: restore seeded stock</summary>

Some catalog tests expect the original seeded stock. If manual orders or an
interrupted test run have changed these values, run the following commands
from the `application` folder:

```cmd
npm run demo:product -- --sku SR-101 --stock 18
npm run demo:product -- --sku SR-118 --stock 22
```

These commands restore the stock values without deleting order history.

</details>

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

GitHub Actions initializes a fresh demo database, builds a pinned Stockroom version
and runs UI, API and hybrid tests.
Credentials are provided through GitHub Secrets.
