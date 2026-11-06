import type { Locator, Page } from '@playwright/test';

export class InventoryPage {
    private readonly page: Page;

    readonly accessDeniedHeading: Locator;
    readonly backToCatalogLink: Locator;
    readonly inventoryTable: Locator;
    readonly supplierColumnHeader: Locator;
    readonly unitCostColumnHeader: Locator;

    constructor(page: Page) {
        this.page = page;

        this.accessDeniedHeading = page.getByRole('heading', {
            name: 'This area is for staff.',
            exact: true
        });

        this.backToCatalogLink = page.getByRole('link', {
            name: 'Back to catalog',
            exact: true
        });

        this.inventoryTable = page.getByRole('table', {
            name: 'Product inventory with supplier and cost information',
            exact: true
        });

        this.supplierColumnHeader = this.inventoryTable.getByRole('columnheader', {
            name: 'Supplier',
            exact: true
        });

        this.unitCostColumnHeader = this.inventoryTable.getByRole('columnheader', {
            name: 'Unit cost',
            exact: true
        });

    }

    async goto() {
        await this.page.goto('/inventory');
    }
}