import type { Locator, Page } from '@playwright/test';

export class OrderDetailsPage {
    private readonly page: Page;

    readonly heading: Locator;
    readonly confirmationMessage: Locator;
    readonly orderNumber: Locator;
    readonly status: Locator;
    readonly orderItems: Locator;
    readonly total: Locator;
    readonly viewOrdersLink: Locator;
    readonly errorMessage: Locator;

    constructor(page: Page) {
        this.page = page;

        this.heading = page.getByRole('heading', { level: 1 });
        this.confirmationMessage = page.getByTestId('order-confirmation');
        this.orderNumber = page.getByTestId('order-number');
        this.status = page.getByTestId('order-status');
        this.orderItems = page.getByTestId('order-item');
        this.total = page.getByTestId('order-total');

        this.viewOrdersLink = page.getByRole('link', {
            name: 'View My orders',
            exact: true,
        });

        this.errorMessage = page.locator('.commerce-alert[role="alert"]');
    }

    async goto(orderId: string): Promise<void> {
        await this.page.goto(`/orders/${orderId}`);
    }

    orderItem(productName: string): Locator {
        return this.orderItems.filter({
            has: this.page.getByRole('link', {
                name: productName,
                exact: true
            })
        });
    }

    itemQuantity(productName: string): Locator {
        return this.orderItem(productName).getByRole('cell').nth(1);
    }

    itemUnitPrice(productName: string): Locator {
        return this.orderItem(productName).getByRole('cell').nth(2);
    }

    itemSubtotal(productName: string): Locator {
        return this.orderItem(productName).getByRole('cell').nth(3);
    }
}