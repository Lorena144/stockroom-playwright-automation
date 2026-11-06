import { test, expect } from '@playwright/test';
import { CatalogPage } from '../../pages/CatalogPage';
import { LoginPage } from '../../pages/LoginPage';
import { getCsrfToken, signInViaApi } from '../../utils/api-auth';
import { requiredEnv } from '../../utils/env';

test('API sign-in gives the browser access to the catalog', async ({ page }) => {
    const email = requiredEnv('CUSTOMER_EMAIL');
    const password = requiredEnv('CUSTOMER_PASSWORD');

    const catalogPage = new CatalogPage(page);

    const loginResponse = await signInViaApi(page.request, email, password);
    expect(loginResponse.status()).toBe(200);

    await page.goto('/catalog');

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);
    await expect(catalogPage.heading).toBeVisible();
    await expect(catalogPage.accountMenu).toContainText('Customer account');
    await expect(catalogPage.signOutButton).toBeVisible();
});

test('API logout ends a session created through the UI', async ({ page }) => {
    const email = requiredEnv('CUSTOMER_EMAIL');
    const password = requiredEnv('CUSTOMER_PASSWORD');
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);

    await loginPage.goto();
    await loginPage.signIn(email, password);

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);
    await expect(catalogPage.heading).toBeVisible();

    const sessionResponse = await page.request.get('/api/auth/session');
    expect(sessionResponse.status()).toBe(200);

    const sessionBody = await sessionResponse.json();
    expect(sessionBody).toMatchObject({
        user: {
            email,
            role: 'customer',
        },
    });

    const csrfToken = await getCsrfToken(page.request);
    const logoutResponse = await page.request.post('/api/auth/logout', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
    });

    expect(logoutResponse.status()).toBe(204);
    expect(await logoutResponse.text()).toBe('');

    await page.reload();

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(catalogPage.signOutButton).toBeHidden();
});