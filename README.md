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
  and logout session revocation; catalog queries, product details and categories;
  cart operations, quantity limits and validation; order placement, details,
  history, pagination, idempotency and cart, token and stock conflicts.
- Hybrid: authentication across API and browser; API/UI consistency for catalog
  results, product details, cart updates and removals, and order details;
  UI order placement checked against the saved API order and emptied cart.

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

Stock-changing tests require the sibling application checkout and the local URL above.

## Test data

Cart tests clear the cart before and after each test.
Stock-changing tests restore the stock values recorded before the test.
Orders created by tests remain in the demo history.

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

## Test selection

- `@smoke`: critical workflows across the application.
- `@sanity`: focused checks for the affected feature.
- `@regression`: all tests in the current suite.

Run smoke or regression tests:

```cmd
npx playwright test --grep "@smoke"
npx playwright test --grep "@regression"
```

For sanity testing, select the affected feature's files. For example:

```cmd
npx playwright test tests/api/cart.spec.ts tests/ui/cart.spec.ts --grep "@sanity"
```

## Reports

View the Playwright HTML report:

```cmd
npx playwright show-report
```

Run tests with fresh Allure results, generate the report and open it:

```cmd
npm run test:allure
npm run allure:generate
npm run allure:open
```

Generated results and reports are excluded from Git.

## CI

GitHub Actions initializes a fresh demo database, builds a pinned Stockroom version
and runs UI, API and hybrid tests inside the official Playwright Docker image.
The image version matches the project's Playwright version.
Credentials are provided through GitHub Secrets.

After successful tests on `main`, the workflow generates and publishes the
[Allure report](https://lorena144.github.io/stockroom-playwright-automation/)
to GitHub Pages. Pull requests do not publish reports.
