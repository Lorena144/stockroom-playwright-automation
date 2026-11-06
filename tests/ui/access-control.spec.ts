import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { CatalogPage } from '../../pages/CatalogPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { requiredEnv } from '../../utils/env';

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