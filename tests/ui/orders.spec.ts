import { test, expect } from '../../fixtures/orders.fixture';
import { CartPage } from '../../pages/CartPage';
import { OrderDetailsPage } from '../../pages/OrderDetailsPage';
import { OrdersPage } from '../../pages/OrdersPage';
import { addCartItem } from '../../utils/api-cart';
import { CatalogPage } from '../../pages/CatalogPage';
import type {
    Order,
    OrderHistoryResponse,
    OrderPlacementResponse,
    OrderSummary,
} from '../../types/orders';
import { setDemoProductStock } from '../../utils/demo-product';
import type { ApiErrorResponse } from '../../types/api';

test('customer can place an order from the cart',
    { tag: '@smoke' },
    async ({ page, request, orderProduct }) => {
        const cartPage = new CartPage(page);
        const orderDetailsPage = new OrderDetailsPage(page);
        const productId = orderProduct.id;
        const productName = orderProduct.name;
        const quantity = 2;

        await test.step('Prepare the cart through the API', async () => {
            const cart = await addCartItem(request, productId, quantity);
            expect(cart.items).toHaveLength(1);
        });

        const currencyFormatter = new Intl.NumberFormat('en-IE', {
            style: 'currency',
            currency: 'EUR',
        });

        const expectedUnitPrice = currencyFormatter.format(
            orderProduct.priceCents / 100
        );

        const expectedTotal = currencyFormatter.format(
            (orderProduct.priceCents * quantity) / 100
        );

        await test.step('Review the cart before checkout', async () => {
            await cartPage.goto();

            await expect(cartPage.quantityInput(productName)).toHaveValue(String(quantity));
            await expect(cartPage.total).toHaveText(expectedTotal);
            await expect(cartPage.placeOrderButton).toBeEnabled();
        });

        await test.step('Place the order and verify the confirmation', async () => {
            await cartPage.placeOrderButton.click();

            await expect(page).toHaveURL(/\/orders\/[^/?]+\?placed=1$/);
            await expect(orderDetailsPage.heading).toHaveText('Order placed');
            await expect(orderDetailsPage.confirmationMessage).toHaveText(
                'Thank you. Your order is saved and the stock has been updated. ' +
                'No payment has been taken.',
            );

            await expect(orderDetailsPage.orderNumber).toHaveText(/\S+/);
            await expect(orderDetailsPage.status).toHaveText('Placed');
            await expect(orderDetailsPage.orderItems).toHaveCount(1);
            await expect(orderDetailsPage.orderItem(productName)).toBeVisible();
            await expect(orderDetailsPage.itemQuantity(productName)).toHaveText(String(quantity));
            await expect(orderDetailsPage.itemUnitPrice(productName)).toHaveText(expectedUnitPrice);
            await expect(orderDetailsPage.itemSubtotal(productName)).toHaveText(expectedTotal);
            await expect(orderDetailsPage.total).toHaveText(expectedTotal);
        });

        await test.step('Verify that the cart is empty', async () => {
            await cartPage.goto();

            await expect(cartPage.emptyCartHeading).toBeVisible();
            await expect(cartPage.cartItems).toHaveCount(0);
            await expect(cartPage.placeOrderButton).toBeHidden();
        });
    });

test('refreshing the confirmation page does not create another one',
    { tag: '@sanity' },
    async ({ page, request, orderProduct }) => {
        const cartPage = new CartPage(page);
        const orderDetailsPage = new OrderDetailsPage(page);
        const ordersPage = new OrdersPage(page);
        const productId = orderProduct.id;
        const productName = orderProduct.name;
        const quantity = 1;

        const initialOrderCount = await test.step('Capture the initial order count', async () => {
            await ordersPage.goto();

            const initialOrderCount = await ordersPage.getOrdersCount();
            expect(initialOrderCount).toBeGreaterThanOrEqual(0);

            return initialOrderCount;
        });

        const expectedOrderCount = initialOrderCount + 1;
        const expectedSummary =
            `${expectedOrderCount} ${expectedOrderCount === 1 ? 'order' : 'orders'}`;

        await test.step('Prepare the cart through the API', async () => {
            const cart = await addCartItem(request, productId, quantity);
            expect(cart.items).toHaveLength(1);
        });

        const expectedTotal = new Intl.NumberFormat('en-IE', {
            style: 'currency',
            currency: 'EUR',
        }).format((orderProduct.priceCents * quantity) / 100);

        const { orderNumber, confirmationURL } = await test.step('Place the order and capture its confirmation', async () => {
            await cartPage.goto();

            await expect(cartPage.placeOrderButton).toBeEnabled();
            await cartPage.placeOrderButton.click();

            await expect(page).toHaveURL(/\/orders\/[^/?]+\?placed=1$/);
            await expect(orderDetailsPage.heading).toHaveText('Order placed');
            await expect(orderDetailsPage.orderNumber).toHaveText(/\S+/);

            const orderNumber = await orderDetailsPage.orderNumber.innerText();
            const confirmationURL = page.url();

            return { orderNumber, confirmationURL };
        });

        await test.step('Refresh the confirmation and verify the same order', async () => {
            await page.reload();

            await expect(page).toHaveURL(confirmationURL);
            await expect(orderDetailsPage.heading).toHaveText('Order placed');
            await expect(orderDetailsPage.confirmationMessage).toBeVisible();
            await expect(orderDetailsPage.orderNumber).toHaveText(orderNumber);
            await expect(orderDetailsPage.status).toHaveText('Placed');
            await expect(orderDetailsPage.orderItems).toHaveCount(1);
            await expect(orderDetailsPage.itemQuantity(productName)).toHaveText(String(quantity));
            await expect(orderDetailsPage.total).toHaveText(expectedTotal);
        });

        await test.step('Verify that order history contains one new order', async () => {
            await orderDetailsPage.viewOrdersLink.click();

            await expect(page).toHaveURL(/\/orders$/);
            await expect(ordersPage.heading).toBeVisible();
            await expect(ordersPage.resultsSummary).toHaveText(expectedSummary);
            await expect(ordersPage.orderLink(orderNumber)).toBeVisible();
            await expect(ordersPage.orderLink(orderNumber)).toHaveCount(1);
        });
    });

test('customer can open a placed order from My orders', async ({ page, request, orderProduct }) => {
    const cartPage = new CartPage(page);
    const orderDetailsPage = new OrderDetailsPage(page);
    const ordersPage = new OrdersPage(page);
    const productId = orderProduct.id;
    const productName = orderProduct.name;
    const quantity = 1;

    const cart = await addCartItem(request, productId, quantity);
    expect(cart.items).toHaveLength(1);

    const expectedTotal = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
    }).format(orderProduct.priceCents * quantity / 100);

    await cartPage.goto();

    await expect(cartPage.placeOrderButton).toBeEnabled();
    await cartPage.placeOrderButton.click();

    await expect(page).toHaveURL(/\/orders\/[^/?]+\?placed=1$/);
    await expect(orderDetailsPage.heading).toHaveText('Order placed');
    await expect(orderDetailsPage.orderNumber).toHaveText(/\S+/);

    const orderNumber = await orderDetailsPage.orderNumber.innerText();
    const orderPath = new URL(page.url()).pathname;

    await orderDetailsPage.viewOrdersLink.click();

    await expect(page).toHaveURL(/\/orders$/);
    await expect(ordersPage.heading).toBeVisible();
    await expect(ordersPage.ordersTable).toBeVisible();
    await expect(ordersPage.orderLink(orderNumber)).toBeVisible();

    await ordersPage.orderLink(orderNumber).click();

    await expect(page).toHaveURL((url) => url.pathname === orderPath);
    await expect(orderDetailsPage.heading).toHaveText('Order details');
    await expect(orderDetailsPage.confirmationMessage).toBeHidden();
    await expect(orderDetailsPage.orderNumber).toHaveText(orderNumber);
    await expect(orderDetailsPage.status).toHaveText('Placed');
    await expect(orderDetailsPage.orderItems).toHaveCount(1);
    await expect(orderDetailsPage.orderItem(productName)).toBeVisible();
    await expect(orderDetailsPage.itemQuantity(productName)).toHaveText(String(quantity));
    await expect(orderDetailsPage.total).toHaveText(expectedTotal);
});

test('customer sees an error for a nonexistent order and can return to My orders', async ({ page, }) => {
    const orderDetailsPage = new OrderDetailsPage(page);
    const ordersPage = new OrdersPage(page);
    const missingOrderId = 'ord-does-not-exist';

    await orderDetailsPage.goto(missingOrderId);

    await expect(orderDetailsPage.heading).toHaveText('Order details');
    await expect(orderDetailsPage.errorMessage).toBeVisible();
    await expect(orderDetailsPage.errorMessage).toContainText(
        'This order could not be found.',
    );
    await expect(orderDetailsPage.orderNumber).toBeHidden();
    await expect(orderDetailsPage.orderItems).toHaveCount(0);
    await expect(orderDetailsPage.total).toBeHidden();
    await expect(orderDetailsPage.confirmationMessage).toBeHidden();
    await expect(orderDetailsPage.viewOrdersLink).toBeVisible();

    await orderDetailsPage.viewOrdersLink.click();

    await expect(page).toHaveURL(/\/orders$/);
    await expect(ordersPage.heading).toBeVisible();
});

test('empty order history displays a link to browse products', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    const catalogPage = new CatalogPage(page);
    const pageSize = 6;

    const emptyHistory: OrderHistoryResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 1,
    };

    await page.route(/\/api\/orders(?:\?.*)?$/, async (route) => {
        await route.fulfill({
            status: 200,
            json: emptyHistory
        });
    });

    await ordersPage.goto();

    await expect(ordersPage.heading).toBeVisible();
    await expect(ordersPage.emptyOrdersHeading).toHaveText('No orders yet.');
    await expect(ordersPage.ordersTable).toBeHidden();
    await expect(ordersPage.orderRows).toHaveCount(0);
    await expect(ordersPage.pagination).toBeHidden();
    await expect(ordersPage.browseProductsLink).toBeVisible();

    await ordersPage.browseProductsLink.click();

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);
    await expect(catalogPage.heading).toBeVisible();
});

test('order history pagination displays the correct orders: Next and Previous', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    const pageSize = 6;
    const totalOrders = pageSize + 1;

    const mockedOrders: OrderSummary[] = Array.from(
        { length: totalOrders },
        (_, index) => ({
            id: `ord-00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
            number: `SR-${String(index + 1).padStart(12, '0')}`,
            status: 'placed',
            currency: 'EUR',
            totalCents: 12900,
            itemCount: 1,
            totalQuantity: 1,
            createdAt: new Date(Date.UTC(2026, 0, totalOrders - index, 12)).toISOString(),
        }),
    );

    const firstPage: OrderHistoryResponse = {
        items: mockedOrders.slice(0, pageSize),
        total: totalOrders,
        page: 1,
        pageSize,
        totalPages: 2
    };

    const secondPage: OrderHistoryResponse = {
        ...firstPage,
        items: mockedOrders.slice(pageSize),
        page: 2
    };

    const expectedFirstPage = firstPage.items.map((order) => order.number);
    const expectedSecondPage = secondPage.items.map((order) => order.number);

    await page.route(/\/api\/orders(?:\?.*)?$/, async (route) => {
        const url = new URL(route.request().url());
        const requestedPage = url.searchParams.get('page') ?? '1';
        const responseBody = requestedPage === '2' ? secondPage : firstPage;

        await route.fulfill({
            status: 200,
            json: responseBody
        });
    });

    await ordersPage.goto();

    await expect(ordersPage.orderNumbers).toHaveText(expectedFirstPage);
    await expect(ordersPage.heading).toBeVisible();
    await expect(ordersPage.resultsSummary).toHaveText(`${totalOrders} orders`);
    await expect(ordersPage.paginationStatus).toHaveText('Page 1 of 2');
    await expect(ordersPage.previousPageLink).toBeHidden();
    await expect(ordersPage.nextPageLink).toBeVisible();

    await ordersPage.nextPageLink.click();

    await expect(page).toHaveURL((url) =>
        url.pathname === '/orders' &&
        url.searchParams.get('page') === String(secondPage.page) &&
        url.searchParams.get('pageSize') === String(pageSize)
    );

    await expect(ordersPage.orderNumbers).toHaveText(expectedSecondPage);
    await expect(ordersPage.resultsSummary).toHaveText(`${totalOrders} orders`);
    await expect(ordersPage.paginationStatus).toHaveText('Page 2 of 2');
    await expect(ordersPage.previousPageLink).toBeVisible();
    await expect(ordersPage.nextPageLink).toBeHidden();

    await ordersPage.previousPageLink.click();

    await expect(page).toHaveURL((url) =>
        url.pathname === '/orders' &&
        url.searchParams.get('page') === String(firstPage.page) &&
        url.searchParams.get('pageSize') === String(pageSize)
    );

    await expect(ordersPage.orderNumbers).toHaveText(expectedFirstPage);
    await expect(ordersPage.paginationStatus).toHaveText('Page 1 of 2');
    await expect(ordersPage.previousPageLink).toBeHidden();
    await expect(ordersPage.nextPageLink).toBeVisible();
});

test('order history returns to the first page when the requested page has no results', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    const pageSize = 6;
    const outOfRange = 2;

    const mockedOrder: OrderSummary = {
        id: 'ord-00000000-0000-4000-8000-000000000001',
        number: 'SR-000000000001',
        status: 'placed',
        currency: 'EUR',
        totalCents: 12900,
        itemCount: 1,
        totalQuantity: 1,
        createdAt: '2026-01-01T12:00:00.000Z',
    };

    const firstPage: OrderHistoryResponse = {
        items: [mockedOrder],
        total: 1,
        page: 1,
        pageSize,
        totalPages: 1
    };

    const emptyPage: OrderHistoryResponse = {
        ...firstPage,
        items: [],
        page: outOfRange
    };

    await page.route(/\/api\/orders(?:\?.*)?$/, async (route) => {
        const url = new URL(route.request().url());
        const requestedPage = url.searchParams.get('page') ?? '1';
        const responseBody = requestedPage === String(outOfRange) ? emptyPage : firstPage;

        await route.fulfill({
            status: 200,
            json: responseBody
        });
    });

    await ordersPage.goto(outOfRange);

    await expect(page).toHaveURL((url) =>
        url.pathname === '/orders' &&
        url.searchParams.get('page') === String(outOfRange)
    );

    await expect(ordersPage.emptyOrdersHeading).toHaveText('No orders on this page.');
    await expect(ordersPage.ordersTable).toBeHidden();
    await expect(ordersPage.orderRows).toHaveCount(0);
    await expect(ordersPage.pagination).toBeHidden();
    await expect(ordersPage.firstPageLink).toBeVisible();

    await ordersPage.firstPageLink.click();

    await expect(page).toHaveURL(/\/orders$/);
    await expect(ordersPage.emptyOrders).toBeHidden();
    await expect(ordersPage.ordersTable).toBeVisible();
    await expect(ordersPage.orderNumbers).toHaveText([mockedOrder.number]);
    await expect(ordersPage.resultsSummary).toHaveText('1 order');
});

test('checkout rejects an order when stock becomes insufficient', async ({ page, request, orderProduct }) => {
    const ordersPage = new OrdersPage(page);
    const cartPage = new CartPage(page);
    const productId = orderProduct.id;
    const productName = orderProduct.name;
    const quantity = 2;
    const remainingStock = quantity - 1;

    await ordersPage.goto();

    const initialOrderCount = await ordersPage.getOrdersCount();
    expect(initialOrderCount).toBeGreaterThanOrEqual(0);

    const cart = await addCartItem(request, productId, quantity);
    expect(cart.items).toHaveLength(1);

    const expectedTotal = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
    }).format((orderProduct.priceCents * quantity) / 100);

    await cartPage.goto();

    await expect(cartPage.quantityInput(productName)).toHaveValue(String(quantity));
    await expect(cartPage.total).toHaveText(expectedTotal);
    await expect(cartPage.placeOrderButton).toBeEnabled();

    await setDemoProductStock(orderProduct.sku, remainingStock);
    await cartPage.placeOrderButton.click();

    await expect(cartPage.errorMessage).toBeVisible();
    await expect(cartPage.errorMessage).toContainText(
        'Some products no longer have enough stock. No order was created.',
    );
    await expect(cartPage.errorMessage).toContainText(
        `Only ${remainingStock} units of ${productName} are available.`,
    );

    await expect(page).toHaveURL(/\/cart$/);
    await expect(cartPage.cartItems).toHaveCount(1);
    await expect(cartPage.quantityInput(productName)).toHaveValue(String(quantity));
    await expect(cartPage.total).toHaveText(expectedTotal);
    await expect(cartPage.placeOrderButton).toBeDisabled();

    await ordersPage.goto();

    expect(await ordersPage.getOrdersCount()).toBe(initialOrderCount);
});

test('order history can be loaded after retrying a server error', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    const pageSize = 6;
    let historyUnavailable = true;

    const serverError: ApiErrorResponse = {
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Something went wrong. Please try again.',
        },
        requestId: '00000000-0000-4000-8000-000000000001',
    };

    const mockedOrder: OrderSummary = {
        id: 'ord-00000000-0000-4000-8000-000000000001',
        number: 'SR-000000000001',
        status: 'placed',
        currency: 'EUR',
        totalCents: 12900,
        itemCount: 1,
        totalQuantity: 1,
        createdAt: '2026-01-01T12:00:00.000Z',
    };

    const history: OrderHistoryResponse = {
        items: [mockedOrder],
        total: 1,
        page: 1,
        pageSize,
        totalPages: 1,
    };

    await test.step('Simulate an unavailable order history', async () => {
        await page.route(/\/api\/orders(?:\?.*)?$/, async (route) => {
            if (historyUnavailable) {
                await route.fulfill({
                    status: 500,
                    json: serverError
                });
                return;
            }

            await route.fulfill({
                status: 200,
                json: history,
            });
        });
    });

    await test.step('Verify the order history error state', async () => {
        await ordersPage.goto();

        await expect(ordersPage.errorMessage).toBeVisible();
        await expect(ordersPage.errorMessage).toContainText(serverError.error.message);
        await expect(ordersPage.retryButton).toBeVisible();
        await expect(ordersPage.ordersTable).toBeHidden();
        await expect(ordersPage.emptyOrders).toBeHidden();
    });

    await test.step('Retry and verify the recovered order history', async () => {
        historyUnavailable = false;
        await ordersPage.retryButton.click();

        await expect(ordersPage.errorMessage).toBeHidden();
        await expect(ordersPage.retryButton).toBeHidden();
        await expect(ordersPage.ordersTable).toBeVisible();
        await expect(ordersPage.orderNumbers).toHaveText([mockedOrder.number]);
        await expect(ordersPage.resultsSummary).toHaveText('1 order');
    });
});

test('customer can recover a lost order confirmation without creating a duplicate', async ({ page, request, orderProduct, }) => {
    const ordersPage = new OrdersPage(page);
    const cartPage = new CartPage(page);
    const orderDetailsPage = new OrderDetailsPage(page);
    const productId = orderProduct.id;
    const productName = orderProduct.name;
    const quantity = 1;
    let placementRequests = 0;

    const captured: {
        order?: Order;
        idempotencyKey?: string;
    } = {};

    const initialOrderCount = await test.step('Capture the initial order count', async () => {
        await ordersPage.goto();

        const initialOrderCount = await ordersPage.getOrdersCount();
        expect(initialOrderCount).toBeGreaterThanOrEqual(0);

        return initialOrderCount;
    });

    await test.step('Prepare the cart through the API', async () => {
        const cart = await addCartItem(request, productId, quantity);
        expect(cart.items).toHaveLength(1);
    });

    const expectedTotal = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
    }).format((orderProduct.priceCents * quantity) / 100);

    await test.step('Simulate a lost first order confirmation', async () => {
        await page.route(/\/api\/orders$/, async (route) => {
            if (route.request().method() !== 'POST') {
                await route.continue();
                return;
            }

            placementRequests += 1;
            const idempotencyKey = route.request().headers()['idempotency-key'];

            if (placementRequests === 1) {
                captured.idempotencyKey = idempotencyKey;
                expect(captured.idempotencyKey).toBeTruthy();

                const response = await route.fetch({ maxRetries: 0 });
                expect(response.status()).toBe(201);

                const body: OrderPlacementResponse = await response.json();
                expect(body.replayed).toBe(false);
                captured.order = body.order;

                await route.abort('failed');
                return;
            }

            expect(idempotencyKey).toBe(captured.idempotencyKey);

            const response = await route.fetch({ maxRetries: 0 });
            expect(response.status()).toBe(200);

            const body: OrderPlacementResponse = await response.json();
            expect(body).toMatchObject({
                replayed: true,
                order: {
                    id: captured.order?.id,
                },
            });

            await route.fulfill({ response });
        });
    });

    await test.step('Review the cart before checkout', async () => {
        await cartPage.goto();

        await expect(cartPage.quantityInput(productName)).toHaveValue(String(quantity));
        await expect(cartPage.total).toHaveText(expectedTotal);
        await expect(cartPage.placeOrderButton).toBeEnabled();
    });

    await test.step('Place the order and verify the recovery state', async () => {
        await cartPage.placeOrderButton.click();

        await expect(page).toHaveURL(/\/cart$/);
        await expect(cartPage.errorMessage).toHaveText('We could not connect. Please try again.');
        await expect(cartPage.recoveryNotice).toBeVisible();
        await expect(cartPage.retryOrderConfirmationButton).toBeEnabled();
        await expect(cartPage.placeOrderButton).toBeDisabled();
    });

    await test.step('Refresh the page and verify that recovery is still available', async () => {
        await page.reload();

        await expect(cartPage.recoveryNotice).toBeVisible();
        await expect(cartPage.emptyCartHeading).toBeVisible();
        await expect(cartPage.retryOrderConfirmationButton).toBeEnabled();
    });

    const savedOrder = captured.order;

    if (!savedOrder) {
        throw new Error('The initial order response was not captured.');
    }

    await test.step('Recover the confirmation for the original order', async () => {
        await cartPage.retryOrderConfirmationButton.click();

        await expect(page).toHaveURL((url) =>
            url.pathname === `/orders/${savedOrder.id}` &&
            url.searchParams.get('placed') === '1',
        );
        await expect(orderDetailsPage.heading).toHaveText('Order placed');
        await expect(orderDetailsPage.orderNumber).toHaveText(savedOrder.number);
        await expect(orderDetailsPage.status).toHaveText('Placed');
        await expect(orderDetailsPage.orderItems).toHaveCount(1);
        await expect(orderDetailsPage.itemQuantity(productName)).toHaveText(String(quantity));
        await expect(orderDetailsPage.total).toHaveText(expectedTotal);
        expect(placementRequests).toBe(2);
    });

    await test.step('Verify that only one order was created', async () => {
        await orderDetailsPage.viewOrdersLink.click();

        expect(await ordersPage.getOrdersCount()).toBe(initialOrderCount + 1);
        await expect(ordersPage.orderLink(savedOrder.number)).toBeVisible();
    });

    await test.step('Verify that the cart is empty and recovery is complete', async () => {
        await cartPage.goto();

        await expect(cartPage.emptyCartHeading).toBeVisible();
        await expect(cartPage.recoveryNotice).toBeHidden();
    });
});