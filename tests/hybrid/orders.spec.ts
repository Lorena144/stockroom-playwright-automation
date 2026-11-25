import { test, expect } from '../../fixtures/orders.fixture';
import { CartPage } from '../../pages/CartPage';
import { OrderDetailsPage } from '../../pages/OrderDetailsPage';
import type { CartResponse } from '../../types/cart';
import type { OrderResponse } from '../../types/orders';
import { addCartItem } from '../../utils/api-cart';
import { placeOrder } from '../../utils/api-orders';

test('order details in the UI match an order created through the API', async ({ page, request, orderProduct }) => {
    const orderDetailsPage = new OrderDetailsPage(page);
    const productId = orderProduct.id;
    const quantity = 2;

    const orderId = await test.step('Create an order through the API', async () => {
        const cart = await addCartItem(request, productId, quantity);
        const order = await placeOrder(request, cart);
        const orderId = order.id;

        return orderId;
    });

    const storedOrder = await test.step('Retrieve the saved order through the API', async () => {
        const response = await request.get(`/api/orders/${orderId}`);
        expect(response.status()).toBe(200);

        const body: OrderResponse = await response.json();
        const storedOrder = body.order;

        expect(storedOrder.items).toHaveLength(1);

        return storedOrder;
    });

    const currencyFormatter = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: storedOrder.currency,
    });
    const expectedTotal = currencyFormatter.format(storedOrder.totalCents / 100);

    await test.step('Compare the UI order details with the API', async () => {
        await orderDetailsPage.goto(orderId);

        await expect(page).toHaveURL(`/orders/${orderId}`);
        await expect(orderDetailsPage.heading).toHaveText('Order details');
        await expect(orderDetailsPage.orderNumber).toHaveText(storedOrder.number);
        await expect(orderDetailsPage.status).toHaveText('Placed');
        await expect(orderDetailsPage.orderItems).toHaveCount(storedOrder.items.length);

        for (const item of storedOrder.items) {
            const productName = item.name;
            const expectedUnitPrice = currencyFormatter.format(item.unitPriceCents / 100);
            const expectedSubtotal = currencyFormatter.format(item.subtotalCents / 100);

            await expect(orderDetailsPage.orderItem(productName)).toBeVisible();
            await expect(orderDetailsPage.itemQuantity(productName)).toHaveText(String(item.quantity));
            await expect(orderDetailsPage.itemUnitPrice(productName)).toHaveText(expectedUnitPrice);
            await expect(orderDetailsPage.itemSubtotal(productName)).toHaveText(expectedSubtotal);
        }

        await expect(orderDetailsPage.total).toHaveText(expectedTotal);
    });
});

test('an order placed through the UI matches the saved API order and empties the cart', async ({ page, request, orderProduct }) => {
    const cartPage = new CartPage(page);
    const orderDetailsPage = new OrderDetailsPage(page);
    const productId = orderProduct.id;
    const productName = orderProduct.name;
    const quantity = 2;
    const ordersEndpoint = '/api/orders';
    const expectedTotalCents = orderProduct.priceCents * quantity;

    await test.step('Prepare and review the cart', async () => {
        await addCartItem(request, productId, quantity);

        await cartPage.goto();

        await expect(cartPage.quantityInput(productName)).toHaveValue(String(quantity));
        await expect(cartPage.placeOrderButton).toBeEnabled();
    });

    const orderId = await test.step('Place the order through the UI', async () => {
        const placementResponsePromise = page.waitForResponse(
            (response) =>
                new URL(response.url()).pathname === ordersEndpoint &&
                response.request().method() === 'POST',
        );

        await cartPage.placeOrderButton.click();

        const placementResponse = await placementResponsePromise;
        expect(placementResponse.status()).toBe(201);

        await expect(page).toHaveURL(/\/orders\/[^/?]+\?placed=1$/);
        await expect(orderDetailsPage.heading).toHaveText('Order placed');

        const orderPath = new URL(page.url()).pathname;
        const orderId = orderPath.slice('/orders/'.length);

        return orderId;
    });

    const storedOrder = await test.step('Verify the saved order through the API', async () => {
        const response = await request.get(`${ordersEndpoint}/${orderId}`);
        expect(response.status()).toBe(200);

        const body: OrderResponse = await response.json();
        const storedOrder = body.order;

        expect(storedOrder).toMatchObject({
            status: 'placed',
            currency: 'EUR',
            itemCount: 1,
            totalQuantity: quantity,
            totalCents: expectedTotalCents,
        });

        expect(storedOrder.items).toEqual([
            {
                productId,
                sku: orderProduct.sku,
                name: productName,
                quantity,
                unitPriceCents: orderProduct.priceCents,
                subtotalCents: expectedTotalCents,
            }
        ]);

        return storedOrder;
    });

    await test.step('Compare the confirmation with the saved API order', async () => {
        const currencyFormatter = new Intl.NumberFormat('en-IE', {
            style: 'currency',
            currency: storedOrder.currency,
        });

        const expectedTotal = currencyFormatter.format(storedOrder.totalCents / 100);

        await expect(orderDetailsPage.orderNumber).toHaveText(storedOrder.number);
        await expect(orderDetailsPage.orderItems).toHaveCount(storedOrder.items.length);
        await expect(orderDetailsPage.itemQuantity(productName)).toHaveText(String(storedOrder.items[0].quantity));
        await expect(orderDetailsPage.itemSubtotal(productName)).toHaveText(expectedTotal);
        await expect(orderDetailsPage.total).toHaveText(expectedTotal);
    });

    await test.step('Verify that the API cart is empty', async () => {
        const cartResponse = await request.get('/api/cart');
        expect(cartResponse.status()).toBe(200);

        const cartBody: CartResponse = await cartResponse.json();
        expect(cartBody.cart).toMatchObject({
            items: [],
            itemCount: 0,
            totalQuantity: 0,
            totalCents: 0,
            canCheckout: false,
        });
    });
});