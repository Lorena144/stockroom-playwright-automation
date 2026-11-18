import type { Locator, Page } from '@playwright/test';

export class ProductDetailsPage {
    private readonly page: Page;

    readonly heading: Locator;
    readonly sku: Locator;
    readonly price: Locator;
    readonly availability: Locator;
    readonly description: Locator;
    readonly stockQuantity: Locator;
    readonly specifications: Locator;
    readonly quantityInput: Locator;
    readonly addToCartButton: Locator;
    readonly statusMessage: Locator;
    readonly viewCartLink: Locator;
    readonly specificationTerms: Locator;
    readonly specificationDefinitions: Locator;

    constructor(page: Page) {
        this.page = page;

        const details = page.getByTestId('product-detail');

        this.heading = details.getByRole('heading', { level: 1 });
        this.sku = details.locator('.detail-sku');
        this.price = details.locator('.detail-price');
        this.availability = details.getByTestId('product-availability');
        this.description = details.locator('.detail-description');
        this.stockQuantity = details.locator('.detail-stock');
        this.specifications = details.locator('.spec-list');
        this.specificationTerms = this.specifications.getByRole('term');
        this.specificationDefinitions = this.specifications.getByRole('definition');

        this.quantityInput = details.getByRole('spinbutton', {
            name: 'Quantity',
            exact: true
        });

        this.addToCartButton = details.getByTestId('add-to-cart');
        this.statusMessage = details.getByRole('status');

        this.viewCartLink = details.getByRole('link', {
            name: 'View cart',
            exact: true,
        });
    }

    async goto(productId: string) {
        await this.page.goto(`/products/${productId}`);
    }

    async isQuantityBelowMinimum(): Promise<boolean> {
        return this.quantityInput.evaluate(
            (input: HTMLInputElement) => input.validity.rangeUnderflow,
        );
    }
}