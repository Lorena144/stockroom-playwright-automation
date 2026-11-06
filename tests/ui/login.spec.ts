import { test, expect } from '@playwright/test';
import { requiredEnv } from '../../utils/env';
import { LoginPage } from '../../pages/LoginPage';
import { CatalogPage } from '../../pages/CatalogPage';
import { randomUUID } from 'node:crypto';

test('sign-in page displays the required controls', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.signInButton).toBeEnabled();
});

test('customer can sign in with valid credentials', async ({ page }) => {
    const email = requiredEnv('CUSTOMER_EMAIL');
    const password = requiredEnv('CUSTOMER_PASSWORD');

    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);

    await loginPage.goto();
    await loginPage.signIn(email, password);

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);
    await expect(catalogPage.heading).toBeVisible();
    await expect(catalogPage.accountMenu).toContainText('Customer account');
    await expect(catalogPage.signOutButton).toBeVisible();
});

test('rejects an unknown email with a generic credentials message', async ({ page }) => {

    const loginPage = new LoginPage(page);
    const unknownEmail = `unknown-${randomUUID()}@stockroom.test`;

    await loginPage.goto();
    await loginPage.signIn(unknownEmail, 'InvalidPassword123!');

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toHaveText(
        'The email or password is incorrect.'
    );

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.signInButton).toBeEnabled();
});

test('requires a password before submitting sign-in', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const email = requiredEnv('CUSTOMER_EMAIL');

    await loginPage.goto();
    await loginPage.signIn(email, '');

    const passwordIsMissing = await loginPage.passwordInput.evaluate(
        (input: HTMLInputElement) => input.validity.valueMissing
    );

    expect(passwordIsMissing).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.errorMessage).toBeHidden();
});

test('requires an email before submitting sign-in', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.signIn('', 'ExamplePassword123!');

    const emailIsMissing = await loginPage.emailInput.evaluate(
        (input: HTMLInputElement) => input.validity.valueMissing
    );

    expect(emailIsMissing).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.errorMessage).toBeHidden();
});

test('rejects an invalid email format before submitting sign-in', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.signIn('not-an-email', 'ExamplePassword123!');

    const emailHasInvalidFormat = await loginPage.emailInput.evaluate(
        (input: HTMLInputElement) => input.validity.typeMismatch
    );

    expect(emailHasInvalidFormat).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.errorMessage).toBeHidden();
});

test('customer can show and hide the entered password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const password = 'ExamplePassword123!';

    await loginPage.goto();
    await loginPage.passwordInput.fill(password);
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

    await loginPage.passwordToggleButton.click();

    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
    await expect(loginPage.passwordToggleButton).toHaveAccessibleName('Hide password');
    await expect(loginPage.passwordInput).toHaveValue(password);

    await loginPage.passwordToggleButton.click();

    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    await expect(loginPage.passwordToggleButton).toHaveAccessibleName('Show password');
    await expect(loginPage.passwordInput).toHaveValue(password);
});

test('customer can sign out and cannot reopen the catalog', async ({ page }) => {
    const email = requiredEnv('CUSTOMER_EMAIL');
    const password = requiredEnv('CUSTOMER_PASSWORD');

    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);

    await loginPage.goto();
    await loginPage.signIn(email, password);

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);
    await expect(catalogPage.heading).toBeVisible();

    await catalogPage.signOutButton.click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.heading).toBeVisible();

    await page.goto('/catalog');

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.emailInput).toBeVisible();
});

test('customer remains signed in after refreshing the catalog', async ({ page }) => {
    const email = requiredEnv('CUSTOMER_EMAIL');
    const password = requiredEnv('CUSTOMER_PASSWORD');

    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);

    await loginPage.goto();
    await loginPage.signIn(email, password);

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);
    await expect(catalogPage.heading).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);
    await expect(catalogPage.heading).toBeVisible();
    await expect(catalogPage.accountMenu).toContainText('Customer account');
    await expect(catalogPage.signOutButton).toBeVisible();
});

