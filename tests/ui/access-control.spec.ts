import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { CatalogPage } from '../../pages/CatalogPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { requiredEnv } from '../../utils/env';
import { CartPage } from '../../pages/CartPage';
import { OrdersPage } from '../../pages/OrdersPage';
import { OrderDetailsPage } from '../../pages/OrderDetailsPage';
import { AccessDeniedPage } from '../../pages/AccessDeniedPage';

test('customer cannot access staff inventory directly', async ({ page }) => {
    const email = requiredEnv('CUSTOMER_EMAIL');
    const password = requiredEnv('CUSTOMER_PASSWORD');

    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);
    const inventoryPage = new InventoryPage(page);

    await loginPage.goto();
    await loginPage.signIn(email, password);

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);
    await expect(catalogPage.heading).toBeVisible();

    await inventoryPage.goto();

    await expect(page).toHaveURL(/\/inventory$/);
    await expect(inventoryPage.accessDeniedHeading).toBeVisible();
    await expect(inventoryPage.inventoryTable).toBeHidden();
    await expect(inventoryPage.backToCatalogLink).toBeVisible();

    await inventoryPage.backToCatalogLink.click();

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);
    await expect(catalogPage.heading).toBeVisible();
});

test('signed-out visitor is redirected from inventory to sign-in', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    await inventoryPage.goto();

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(inventoryPage.inventoryTable).toBeHidden();
});

test('staff can view inventory with supplier and cost information', async ({ page }) => {
    const email = requiredEnv('STAFF_EMAIL');
    const password = requiredEnv('STAFF_PASSWORD');

    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);
    const inventoryPage = new InventoryPage(page);

    await loginPage.goto();
    await loginPage.signIn(email, password);

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);
    await expect(catalogPage.accountMenu).toContainText('Operations staff');

    await inventoryPage.goto();
    await expect(page).toHaveURL(/\/inventory(?:\?.*)?$/);
    await expect(inventoryPage.inventoryTable).toBeVisible();
    await expect(inventoryPage.unitCostColumnHeader).toBeVisible();
    await expect(inventoryPage.supplierColumnHeader).toBeVisible();
    await expect(inventoryPage.accessDeniedHeading).toBeHidden();
});

test('signed-out visitor is redirected from customer shopping pages to sign-in', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const cartPage = new CartPage(page);
    const ordersPage = new OrdersPage(page);
    const orderDetailsPage = new OrderDetailsPage(page);
    const orderId = 'ord-00000000-0000-4000-8000-000000000001';

    const protectedPages = [
        {
            name: 'Cart',
            navigate: () => cartPage.goto(),
            protectedContent: cartPage.heading,
        },
        {
            name: 'My orders',
            navigate: () => ordersPage.goto(),
            protectedContent: ordersPage.ordersTable,
        },
        {
            name: 'Order details',
            navigate: () => orderDetailsPage.goto(orderId),
            protectedContent: orderDetailsPage.orderNumber,
        },
    ];

    for (const protectedPage of protectedPages) {
        await test.step(`Redirect from ${protectedPage.name} to sign-in`, async () => {
            await protectedPage.navigate();

            await expect(page).toHaveURL(/\/login$/);
            await expect(loginPage.heading).toBeVisible();
            await expect(loginPage.emailInput).toBeVisible();
            await expect(loginPage.passwordInput).toBeVisible();
            await expect(loginPage.signInButton).toBeVisible();
            await expect(protectedPage.protectedContent).toBeHidden();
        });
    }
});

test('staff cannot access customer shopping pages', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const catalogPage = new CatalogPage(page);
    const cartPage = new CartPage(page);
    const ordersPage = new OrdersPage(page);
    const orderDetailsPage = new OrderDetailsPage(page);
    const accessDeniedPage = new AccessDeniedPage(page);
    const email = requiredEnv('STAFF_EMAIL');
    const password = requiredEnv('STAFF_PASSWORD');
    const orderId = 'ord-00000000-0000-4000-8000-000000000001';

    await loginPage.goto();
    await loginPage.signIn(email, password);

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);
    await expect(catalogPage.accountMenu).toContainText('Operations staff');

    const protectedPages = [
        {
            name: 'Cart',
            path: '/cart',
            navigate: () => cartPage.goto(),
            expectedHeading: 'Shopping is for customer accounts.',
            expectedMessage: 'Sign in with a customer account to use the cart.',
            protectedContent: cartPage.heading,
        },
        {
            name: 'My orders',
            path: '/orders',
            navigate: () => ordersPage.goto(),
            expectedHeading: 'Orders belong to customer accounts.',
            expectedMessage: 'Staff accounts cannot access customer purchase history.',
            protectedContent: ordersPage.ordersTable,
        },
        {
            name: 'Order details',
            path: `/orders/${orderId}`,
            navigate: () => orderDetailsPage.goto(orderId),
            expectedHeading: 'Orders belong to customer accounts.',
            expectedMessage: 'Staff accounts cannot access customer order details.',
            protectedContent: orderDetailsPage.orderNumber,
        },
    ];

    for (const protectedPage of protectedPages) {
        await test.step(`Deny staff access to ${protectedPage.name}`, async () => {
            await protectedPage.navigate();

            await expect(page).toHaveURL((url) => url.pathname === protectedPage.path);
            await expect(accessDeniedPage.heading).toHaveText(protectedPage.expectedHeading);
            await expect(accessDeniedPage.message).toHaveText(protectedPage.expectedMessage);
            await expect(protectedPage.protectedContent).toBeHidden();
            await expect(accessDeniedPage.backToCatalogLink).toBeVisible();

            await accessDeniedPage.backToCatalogLink.click();

            await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);
            await expect(catalogPage.heading).toBeVisible();
            await expect(catalogPage.accountMenu).toContainText('Operations staff');
        });
    }
});