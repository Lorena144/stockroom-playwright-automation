import type { Locator, Page } from '@playwright/test';

export class OrdersPage {
    private readonly page: Page;
    private readonly loadedContent: Locator;

    readonly heading: Locator;
    readonly ordersTable: Locator;
    readonly emptyOrders: Locator;
    readonly resultsSummary: Locator;
    readonly emptyOrdersHeading: Locator;
    readonly browseProductsLink: Locator;
    readonly orderRows: Locator;
    readonly orderNumbers: Locator;
    readonly pagination: Locator;
    readonly paginationStatus: Locator;
    readonly previousPageLink: Locator;
    readonly nextPageLink: Locator;
    readonly firstPageLink: Locator;
    readonly errorMessage: Locator;
    readonly retryButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.heading = page.getByRole('heading',
            {
                name: 'My orders',
                exact: true
            });

        this.ordersTable = page.getByRole('table',
            {
                name: 'Your order history',
                exact: true
            });

        this.emptyOrders = page.getByTestId('empty-orders');
        this.resultsSummary = page.getByRole('status');
        this.loadedContent = this.ordersTable.or(this.emptyOrders);
        this.emptyOrdersHeading = this.emptyOrders.getByRole('heading', { level: 2 });

        this.browseProductsLink = this.emptyOrders.getByRole('link', {
            name: 'Browse products',
            exact: true,
        });

        this.orderRows = this.ordersTable.getByTestId('order-row');
        this.orderNumbers = this.orderRows.getByRole('link');

        this.pagination = page.getByRole('navigation',
            {
                name: 'Order pagination',
                exact: true
            });

        this.paginationStatus = this.pagination.locator('span');

        this.previousPageLink = this.pagination.getByRole('link', {
            name: 'Previous page',
            exact: true,
        });

        this.nextPageLink = this.pagination.getByRole('link', {
            name: 'Next page',
            exact: true,
        });

        this.firstPageLink = this.emptyOrders.getByRole('link',
            {
                name: 'First page',
                exact: true
            }
        );

        this.errorMessage = page.locator('.commerce-alert[role="alert"]');

        this.retryButton = this.errorMessage.getByRole('button', {
            name: 'Try again',
            exact: true,
        });

    }

    async goto(pageNumber = 1): Promise<void> {
        const path = pageNumber === 1 ? '/orders' : `/orders?page=${pageNumber}`;

        await this.page.goto(path);
    }

    orderLink(orderNumber: string): Locator {
        return this.ordersTable.getByRole('link',
            {
                name: orderNumber,
                exact: true
            });
    }

    async getOrdersCount(): Promise<number> {
        await this.loadedContent.waitFor({ state: 'visible' });

        if (await this.emptyOrders.isVisible()) {
            return 0;
        }

        const summary = await this.resultsSummary.innerText();

        return Number.parseInt(summary, 10);
    }
}