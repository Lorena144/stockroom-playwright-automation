import type { Locator, Page } from '@playwright/test';

export class ProductDetailsPage {
    readonly heading: Locator;
    readonly sku: Locator;
    readonly price: Locator;
    readonly availability: Locator;
    readonly description: Locator;
    readonly stockQuantity: Locator;
    readonly specifications: Locator;

    constructor(page: Page) {
        const details = page.getByTestId('product-detail');

        this.heading = details.getByRole('heading', { level: 1 });
        this.sku = details.locator('.detail-sku');
        this.price = details.locator('.detail-price');
        this.availability = details.getByTestId('product-availability');
        this.description = details.locator('.detail-description');
        this.stockQuantity = details.locator('.detail-stock');
        this.specifications = details.locator('.spec-list');
    }
}