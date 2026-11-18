import type { Locator, Page } from '@playwright/test';

export class AccessDeniedPage {
    readonly heading: Locator;
    readonly message: Locator;
    readonly backToCatalogLink: Locator;

    constructor(page: Page) {
        const mainContent = page.getByRole('main');

        this.heading = mainContent.getByRole('heading', { level: 1 });
        this.message = mainContent.locator('p');

        this.backToCatalogLink = mainContent.getByRole('link', {
            name: 'Back to catalog',
            exact: true,
        });
    }
}