# Stockroom Playwright Automation

UI and API automation for the Stockroom order and inventory management application,
using Playwright and TypeScript.

## Current coverage

- UI: sign-in, form validation, password visibility, sessions, sign-out and access control.
- API: authentication, sessions, inventory permissions, validation, CSRF and Origin checks,
  and logout session revocation.

UI tests run in Chromium, Firefox and WebKit. API tests run in a separate project.

## Setup

Requires Node.js 24 LTS and a running Stockroom application.

```cmd
npm ci
npx playwright install chromium firefox webkit
```

An `.env.example` file lists the required environment variables.
Create your local `.env` file using that template and configure your test accounts.

## Run

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

## Reports

```cmd
npx playwright show-report
```