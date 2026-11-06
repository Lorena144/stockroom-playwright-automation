import type { Locator, Page } from "@playwright/test";

export class CatalogPage {
    readonly heading: Locator;
    readonly accountMenu: Locator;
    readonly signOutButton: Locator;

    constructor(page: Page) {
        this.heading = page.getByRole('heading', {
            name: 'Good tools. Better workdays.',
            exact: true
        });

        this.accountMenu = page.locator('.account-menu');
        this.signOutButton = page.getByRole('button', {
            name: 'Sign out',
            exact: true
        });
    }
}