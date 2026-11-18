import type { Locator, Page } from '@playwright/test';

export class CartPage {
    private readonly page: Page;

    readonly heading: Locator;
    readonly emptyCart: Locator;
    readonly emptyCartHeading: Locator;
    readonly browseProductsLink: Locator;
    readonly cartItems: Locator;
    readonly total: Locator;
    readonly placeOrderButton: Locator;
    readonly statusMessage: Locator;
    readonly errorMessage: Locator;
    readonly refreshCartButton: Locator;
    readonly signOutButton: Locator;
    readonly recoveryNotice: Locator;
    readonly retryOrderConfirmationButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.heading = page.getByRole('heading', {
            name: 'Your cart',
            exact: true
        });

        this.emptyCart = page.getByTestId('empty-cart');

        this.emptyCartHeading = page.getByRole('heading', {
            name: 'Your cart is empty.',
            exact: true
        });

        this.browseProductsLink = page.getByRole('link', {
            name: 'Browse products',
            exact: true
        });

        this.cartItems = page.getByTestId('cart-item');
        this.total = page.getByTestId('cart-total');
        this.placeOrderButton = page.getByTestId('place-order');
        this.statusMessage = page.getByRole('status');

        this.errorMessage = page.locator('.commerce-alert[role="alert"]');

        this.refreshCartButton = page.getByRole('button', {
            name: 'Refresh cart',
            exact: true,
        });

        this.signOutButton = page.getByRole('button', {
            name: 'Sign out',
            exact: true,
        });

        this.recoveryNotice = page.getByRole('region', {
            name: 'Order confirmation recovery',
            exact: true,
        });

        this.retryOrderConfirmationButton = this.recoveryNotice.getByRole('button', {
            name: 'Retry order confirmation',
            exact: true,
        });
    }

    async goto() {
        await this.page.goto('/cart');
    }

    item(productName: string): Locator {
        return this.cartItems.filter({
            has: this.page.getByRole('link', {
                name: productName,
                exact: true
            })
        });
    }

    quantityInput(productName: string): Locator {
        return this.item(productName).getByRole('spinbutton', {
            name: `Quantity for ${productName}`,
            exact: true
        });
    }

    updateQuantityButton(productName: string): Locator {
        return this.item(productName).getByRole('button', {
            name: `Update quantity for ${productName}`,
            exact: true
        });
    }

    removeButton(productName: string): Locator {
        return this.item(productName).getByRole('button', {
            name: `Remove ${productName} from cart`,
            exact: true
        });
    }

    cartItemTotal(productName: string): Locator {
        return this.item(productName).getByTestId('cart-line-total');
    }

    async isQuantityBelowMinimum(productName: string): Promise<boolean> {
        return this.quantityInput(productName).evaluate(
            (input: HTMLInputElement) => input.validity.rangeUnderflow,
        );
    }
}