import { randomUUID } from 'node:crypto';
import { test, expect } from '../../fixtures/orders.fixture';
import type { ApiErrorResponse } from '../../types/api';
import type { CartResponse } from '../../types/cart';
import type { ProductDetailsResponse } from '../../types/catalog';
import type {
    OrderHistoryResponse,
    OrderPlacementResponse,
    OrderResponse,
} from '../../types/orders';
import { getCsrfToken, signInViaApi } from '../../utils/api-auth';
import { addCartItem, clearCart } from '../../utils/api-cart';
import { placeOrder } from '../../utils/api-orders';
import { requiredEnv } from '../../utils/env';
import { setDemoProductStock } from '../../utils/demo-product';

test('API places an order from the cart and updates stock', async ({ request, orderProduct }) => {
    const productId = orderProduct.id;
    const quantity = 2;
    const expectedTotalCents = orderProduct.priceCents * quantity;
    const idempotencyKey = randomUUID();
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const cart = await addCartItem(request, productId, quantity);

    expect(cart.items).toHaveLength(1);
    expect(cart.totalQuantity).toBe(quantity);

    const csrfToken = await getCsrfToken(request);

    const response = await request.post('/api/orders', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
            'Idempotency-Key': idempotencyKey,
        },
        data: {
            cartVersion: cart.version,
            checkoutToken: cart.checkoutToken,
        },
    });


    expect(response.status()).toBe(201);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: OrderPlacementResponse = await response.json();
    const order = body.order;

    expect(body.replayed).toBe(false);
    expect(order).toMatchObject({
        status: 'placed',
        currency: 'EUR',
        totalCents: expectedTotalCents,
        itemCount: 1,
        totalQuantity: quantity,
        createdAt: expect.any(String),
    });

    expect(order.items).toEqual([
        {
            productId,
            sku: orderProduct.sku,
            name: orderProduct.name,
            quantity,
            unitPriceCents: orderProduct.priceCents,
            subtotalCents: expectedTotalCents,
        },
    ]);

    const orderId = order.id;
    expect(response.headers()['location']).toBe(`/api/orders/${orderId}`);

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

    const productResponse = await request.get(`/api/products/${productId}`);
    expect(productResponse.status()).toBe(200);

    const productBody: ProductDetailsResponse = await productResponse.json();
    expect(productBody.product.stock).toBe(orderProduct.stock - quantity);
});

test('API returns details for a placed order', async ({ request, orderProduct }) => {
    const productId = orderProduct.id;
    const quantity = 1;

    const cart = await addCartItem(request, productId, quantity);
    const order = await placeOrder(request, cart);
    const orderId = order.id;

    const response = await request.get(`/api/orders/${orderId}`);
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: OrderResponse = await response.json();
    expect(body.order).toEqual(order);
});

test('API returns order history with default pagination', async ({ request, orderProduct }) => {
    const productId = orderProduct.id;
    const quantity = 1;
    const pageSize = 6;

    const initialResponse = await request.get('/api/orders');
    expect(initialResponse.status()).toBe(200);

    const initialBody: OrderHistoryResponse = await initialResponse.json();

    const cart = await addCartItem(request, productId, quantity);
    const order = await placeOrder(request, cart);
    const expectedTotal = initialBody.total + 1;

    const response = await request.get('/api/orders');
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: OrderHistoryResponse = await response.json();
    expect(body).toMatchObject({
        total: expectedTotal,
        page: 1,
        pageSize,
        totalPages: Math.ceil(expectedTotal / pageSize),
    });

    expect(body.items).toContainEqual({
        id: order.id,
        number: order.number,
        status: order.status,
        currency: order.currency,
        totalCents: order.totalCents,
        itemCount: order.itemCount,
        totalQuantity: order.totalQuantity,
        createdAt: order.createdAt,
    });
});

test('API returns 404 for a nonexistent order', async ({ request }) => {
    const orderId = `ord-${randomUUID()}`;

    const response = await request.get(`/api/orders/${orderId}`);
    expect(response.status()).toBe(404);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'ORDER_NOT_FOUND',
            message: 'This order could not be found.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('order');
});

test('API rejects placing an order from an empty cart', async ({ request }) => {
    const idempotencyKey = randomUUID();
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    await clearCart(request);

    const initialCartResponse = await request.get('/api/cart');
    expect(initialCartResponse.status()).toBe(200);

    const initialCartBody: CartResponse = await initialCartResponse.json();
    const cart = initialCartBody.cart;

    expect(cart.items).toHaveLength(0);

    const initialHistoryResponse = await request.get('/api/orders');
    expect(initialHistoryResponse.status()).toBe(200);

    const initialHistory: OrderHistoryResponse = await initialHistoryResponse.json();
    const csrfToken = await getCsrfToken(request);

    const response = await request.post('/api/orders', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
            'Idempotency-Key': idempotencyKey,
        },
        data: {
            cartVersion: cart.version,
            checkoutToken: cart.checkoutToken,
        },
    });
    expect(response.status()).toBe(409);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'EMPTY_CART',
            message: 'Your cart is empty. Add a product before placing an order.',
        },
        requestId: expect.any(String),
    });
    expect(body).not.toHaveProperty('order');

    const historyResponse = await request.get('/api/orders');
    expect(historyResponse.status()).toBe(200);

    const history: OrderHistoryResponse = await historyResponse.json();
    expect(history.total).toBe(initialHistory.total);

    const cartResponse = await request.get('/api/cart');
    expect(cartResponse.status()).toBe(200);

    const cartBody: CartResponse = await cartResponse.json();
    expect(cartBody.cart).toEqual(cart);
});

test('API replays an order request without creating a duplicate or reducing stock twice', async ({ request, orderProduct }) => {
    const productId = orderProduct.id;
    const quantity = 2;
    const idempotencyKey = randomUUID();
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const cart = await addCartItem(request, productId, quantity);

    const initialHistoryResponse = await request.get('/api/orders');
    expect(initialHistoryResponse.status()).toBe(200);

    const initialHistory: OrderHistoryResponse = await initialHistoryResponse.json();

    const csrfToken = await getCsrfToken(request);

    const headers = {
        Origin: origin,
        'X-CSRF-Token': csrfToken,
        'Idempotency-Key': idempotencyKey,
    };

    const data = {
        cartVersion: cart.version,
        checkoutToken: cart.checkoutToken,
    };

    const firstResponse = await request.post('/api/orders', {
        headers,
        data
    });
    expect(firstResponse.status()).toBe(201);

    const firstBody: OrderPlacementResponse = await firstResponse.json();
    expect(firstBody.replayed).toBe(false);

    const response = await request.post('/api/orders', {
        headers,
        data,
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: OrderPlacementResponse = await response.json();

    expect(body.replayed).toBe(true);
    expect(body.order).toEqual(firstBody.order);

    const historyResponse = await request.get('/api/orders');
    expect(historyResponse.status()).toBe(200);

    const history: OrderHistoryResponse = await historyResponse.json();
    expect(history.total).toBe(initialHistory.total + 1);

    const productResponse = await request.get(`/api/products/${productId}`);
    expect(productResponse.status()).toBe(200);

    const productBody: ProductDetailsResponse = await productResponse.json();
    expect(productBody.product.stock).toBe(orderProduct.stock - quantity);

    const cartResponse = await request.get('/api/cart');
    expect(cartResponse.status()).toBe(200);

    const cartBody: CartResponse = await cartResponse.json();
    expect(cartBody.cart.items).toHaveLength(0);
    expect(cartBody.cart.totalCents).toBe(0);
});

test('API replays the same reviewed cart with a different idempotency key', async ({ request, orderProduct }) => {
    const productId = orderProduct.id;
    const quantity = 2;
    const firstIdempotencyKey = randomUUID();
    const secondIdempotencyKey = randomUUID();
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const cart = await addCartItem(request, productId, quantity);

    const initialHistoryResponse = await request.get('/api/orders');
    expect(initialHistoryResponse.status()).toBe(200);

    const initialHistory: OrderHistoryResponse = await initialHistoryResponse.json();
    const csrfToken = await getCsrfToken(request);

    const headers = {
        Origin: origin,
        'X-CSRF-Token': csrfToken,
        'Idempotency-Key': firstIdempotencyKey,
    };

    const data = {
        cartVersion: cart.version,
        checkoutToken: cart.checkoutToken,
    };

    const firstResponse = await request.post('/api/orders', {
        headers,
        data,
    });

    expect(firstResponse.status()).toBe(201);

    const firstBody: OrderPlacementResponse = await firstResponse.json();
    expect(firstBody.replayed).toBe(false);

    const response = await request.post('/api/orders', {
        headers: {
            ...headers,
            'Idempotency-Key': secondIdempotencyKey,
        },
        data,
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: OrderPlacementResponse = await response.json();

    expect(body.replayed).toBe(true);
    expect(body.order).toEqual(firstBody.order);

    const historyResponse = await request.get('/api/orders');
    expect(historyResponse.status()).toBe(200);

    const history: OrderHistoryResponse = await historyResponse.json();
    expect(history.total).toBe(initialHistory.total + 1);

    const productResponse = await request.get(`/api/products/${productId}`);
    expect(productResponse.status()).toBe(200);

    const productBody: ProductDetailsResponse = await productResponse.json();
    expect(productBody.product.stock).toBe(orderProduct.stock - quantity);
});

test('API rejects reusing an idempotency key with different order details', async ({ request, orderProduct }) => {
    const productId = orderProduct.id;
    const quantity = 1;
    const idempotencyKey = randomUUID();
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const firstCart = await addCartItem(request, productId, quantity);

    const initialHistoryResponse = await request.get('/api/orders');
    expect(initialHistoryResponse.status()).toBe(200);

    const initialHistory: OrderHistoryResponse = await initialHistoryResponse.json();
    const csrfToken = await getCsrfToken(request);

    const headers = {
        Origin: origin,
        'X-CSRF-Token': csrfToken,
        'Idempotency-Key': idempotencyKey,
    };

    const firstResponse = await request.post('/api/orders', {
        headers,
        data: {
            cartVersion: firstCart.version,
            checkoutToken: firstCart.checkoutToken,
        },
    });
    expect(firstResponse.status()).toBe(201);

    const nextCart = await addCartItem(request, productId, quantity);
    const response = await request.post('/api/orders', {
        headers,
        data: {
            cartVersion: nextCart.version,
            checkoutToken: nextCart.checkoutToken,
        },
    });
    expect(response.status()).toBe(409);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'IDEMPOTENCY_KEY_REUSED',
            message: 'This request key was already used for different order details.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('order');

    const historyResponse = await request.get('/api/orders');
    expect(historyResponse.status()).toBe(200);

    const history: OrderHistoryResponse = await historyResponse.json();
    expect(history.total).toBe(initialHistory.total + 1);

    const cartResponse = await request.get('/api/cart');
    expect(cartResponse.status()).toBe(200);

    const cartBody: CartResponse = await cartResponse.json();
    expect(cartBody.cart).toEqual(nextCart);

    const productResponse = await request.get(`/api/products/${productId}`);
    expect(productResponse.status()).toBe(200);

    const productBody: ProductDetailsResponse = await productResponse.json();
    expect(productBody.product.stock).toBe(orderProduct.stock - quantity);
});

test('API rejects placing an order with an outdated cart version', async ({ request, orderProduct }) => {
    const productId = orderProduct.id;
    const initialQuantity = 1;
    const additionalQuantity = 1;
    const idempotencyKey = randomUUID();
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const reviewedCart = await addCartItem(request, productId, initialQuantity);
    const currentCart = await addCartItem(request, productId, additionalQuantity);

    expect(currentCart.version).toBeGreaterThan(reviewedCart.version);

    const initialHistoryResponse = await request.get('/api/orders');
    expect(initialHistoryResponse.status()).toBe(200);

    const initialHistory: OrderHistoryResponse = await initialHistoryResponse.json();
    const csrfToken = await getCsrfToken(request);

    const response = await request.post('/api/orders', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
            'Idempotency-Key': idempotencyKey,
        },
        data: {
            cartVersion: reviewedCart.version,
            checkoutToken: reviewedCart.checkoutToken,
        },
    });

    expect(response.status()).toBe(409);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'CART_CHANGED',
            message: 'Your cart changed in another request. Refresh it and review the quantities.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('order');

    const historyResponse = await request.get('/api/orders');
    expect(historyResponse.status()).toBe(200);

    const history: OrderHistoryResponse = await historyResponse.json();
    expect(history.total).toBe(initialHistory.total);

    const cartResponse = await request.get('/api/cart');
    expect(cartResponse.status()).toBe(200);

    const cartBody: CartResponse = await cartResponse.json();
    expect(cartBody.cart).toEqual(currentCart);

    const productResponse = await request.get(`/api/products/${productId}`);
    expect(productResponse.status()).toBe(200);

    const productBody: ProductDetailsResponse = await productResponse.json();
    expect(productBody.product.stock).toBe(orderProduct.stock);
});

test('API rejects placing an order with a checkout token that does not match the cart', async ({ request, orderProduct }) => {
    const productId = orderProduct.id;
    const quantity = 1;
    const idempotencyKey = randomUUID();
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const cart = await addCartItem(request, productId, quantity);
    const replacementCharacter = cart.checkoutToken[0] === '0' ? '1' : '0';
    const invalidCheckoutToken = replacementCharacter + cart.checkoutToken.slice(1);

    const initialHistoryResponse = await request.get('/api/orders');

    expect(initialHistoryResponse.status()).toBe(200);

    const initialHistory: OrderHistoryResponse = await initialHistoryResponse.json();
    const csrfToken = await getCsrfToken(request);

    const response = await request.post('/api/orders', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
            'Idempotency-Key': idempotencyKey,
        },
        data: {
            cartVersion: cart.version,
            checkoutToken: invalidCheckoutToken,
        },
    });

    expect(response.status()).toBe(409);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'PRICE_CHANGED',
            message: 'Prices changed since your cart was displayed. Refresh the cart and review the new total.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('order');

    const historyResponse = await request.get('/api/orders');
    expect(historyResponse.status()).toBe(200);

    const history: OrderHistoryResponse = await historyResponse.json();
    expect(history.total).toBe(initialHistory.total);

    const cartResponse = await request.get('/api/cart');
    expect(cartResponse.status()).toBe(200);

    const cartBody: CartResponse = await cartResponse.json();
    expect(cartBody.cart).toEqual(cart);

    const productResponse = await request.get(`/api/products/${productId}`);
    expect(productResponse.status()).toBe(200);

    const productBody: ProductDetailsResponse = await productResponse.json();
    expect(productBody.product.stock).toBe(orderProduct.stock);
});

test('API rejects order placement when stock drops below the reviewed quantity', async ({ request, orderProduct }) => {
    const productId = orderProduct.id;
    const quantity = 2;
    const remainingStock = 1;
    const idempotencyKey = randomUUID();
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const cart = await addCartItem(request, productId, quantity);

    const initialHistoryResponse = await request.get('/api/orders');
    expect(initialHistoryResponse.status()).toBe(200);

    const initialHistory: OrderHistoryResponse = await initialHistoryResponse.json();

    await setDemoProductStock(orderProduct.sku, remainingStock);

    const csrfToken = await getCsrfToken(request);
    const response = await request.post('/api/orders', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
            'Idempotency-Key': idempotencyKey,
        },
        data: {
            cartVersion: cart.version,
            checkoutToken: cart.checkoutToken,
        },
    });

    expect(response.status()).toBe(409);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'STOCK_CHANGED',
            message: 'Some products no longer have enough stock. No order was created.',
            fields: {
                [productId]: expect.arrayContaining([expect.any(String)]),
            },
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('order');

    const historyResponse = await request.get('/api/orders');
    expect(historyResponse.status()).toBe(200);

    const history: OrderHistoryResponse = await historyResponse.json();
    expect(history.total).toBe(initialHistory.total);

    const cartResponse = await request.get('/api/cart');
    expect(cartResponse.status()).toBe(200);

    const cartBody: CartResponse = await cartResponse.json();
    expect(cartBody.cart).toMatchObject({
        version: cart.version,
        checkoutToken: cart.checkoutToken,
        itemCount: 1,
        totalQuantity: quantity,
        totalCents: cart.totalCents,
        canCheckout: false,
    });

    expect(cartBody.cart.items).toHaveLength(1);
    expect(cartBody.cart.items[0]).toMatchObject({
        productId,
        quantity,
        stock: remainingStock,
        available: false,
    });

    const productResponse = await request.get(`/api/products/${productId}`);
    expect(productResponse.status()).toBe(200);

    const productBody: ProductDetailsResponse = await productResponse.json();
    expect(productBody.product.stock).toBe(remainingStock);
});

test('API rejects placing an order with an invalid idempotency key', async ({ request, orderProduct }) => {
    const productId = orderProduct.id;
    const quantity = 1;
    const invalidIdempotencyKey = 'not-a-uuid';
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const cart = await addCartItem(request, productId, quantity);

    const initialHistoryResponse = await request.get('/api/orders');
    expect(initialHistoryResponse.status()).toBe(200);

    const initialHistory: OrderHistoryResponse = await initialHistoryResponse.json();
    const csrfToken = await getCsrfToken(request);

    const response = await request.post('/api/orders', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
            'Idempotency-Key': invalidIdempotencyKey,
        },
        data: {
            cartVersion: cart.version,
            checkoutToken: cart.checkoutToken,
        },
    });

    expect(response.status()).toBe(422);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the supplied values.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('order');

    const historyResponse = await request.get('/api/orders');
    expect(historyResponse.status()).toBe(200);

    const history: OrderHistoryResponse = await historyResponse.json();
    expect(history.total).toBe(initialHistory.total);

    const cartResponse = await request.get('/api/cart');
    expect(cartResponse.status()).toBe(200);

    const cartBody: CartResponse = await cartResponse.json();
    expect(cartBody.cart).toEqual(cart);

    const productResponse = await request.get(`/api/products/${productId}`);
    expect(productResponse.status()).toBe(200);

    const productBody: ProductDetailsResponse = await productResponse.json();
    expect(productBody.product.stock).toBe(orderProduct.stock);
});

test('API returns no orders for a page beyond the last page', async ({ request }) => {
    const pageSize = 6;

    const initialResponse = await request.get('/api/orders', {
        params: {
            pageSize,
        },
    });

    expect(initialResponse.status()).toBe(200);
    const initialBody: OrderHistoryResponse = await initialResponse.json();
    const expectedTotalPages = Math.max(1, Math.ceil(initialBody.total / pageSize));
    const outOfRangePage = expectedTotalPages + 1;

    const response = await request.get('/api/orders', {
        params: {
            page: outOfRangePage,
            pageSize,
        },
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: OrderHistoryResponse = await response.json();

    expect(body.items).toHaveLength(0);
    expect(body).toMatchObject({
        total: initialBody.total,
        page: outOfRangePage,
        pageSize,
        totalPages: expectedTotalPages,
    });
});

test('API rejects an unsupported order history page size', async ({ request }) => {
    const invalidPageSize = 10;

    const response = await request.get('/api/orders', {
        params: {
            pageSize: invalidPageSize,
        },
    });

    expect(response.status()).toBe(422);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the supplied values.',
            fields: {
                pageSize: expect.arrayContaining([expect.any(String)]),
            },
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('items');
});

test('API rejects unauthenticated access to order history and details', async ({ request, playwright, orderProduct }) => {
    const productId = orderProduct.id;
    const quantity = 1;
    const baseURL = requiredEnv('UI_BASE_URL');

    const cart = await addCartItem(request, productId, quantity);
    const order = await placeOrder(request, cart);
    const orderId = order.id;

    const guestRequest = await playwright.request.newContext({
        baseURL,
        storageState: {
            cookies: [],
            origins: [],
        },
    });

    try {
        const endpoints = [
            '/api/orders',
            `/api/orders/${orderId}`
        ];

        for (const endpoint of endpoints) {
            await test.step(`GET ${endpoint} requires authentication`, async () => {
                const response = await guestRequest.get(endpoint);
                expect(response.status()).toBe(401);

                const contentType = response.headers()['content-type'];
                const mediaType = contentType?.split(';')[0].trim().toLowerCase();

                expect(mediaType).toBe('application/json');

                const body: ApiErrorResponse = await response.json();

                expect(body).toMatchObject({
                    error: {
                        code: 'UNAUTHENTICATED',
                        message: 'Please sign in to continue.',
                    },
                    requestId: expect.any(String),
                });

                expect(body).not.toHaveProperty('items');
                expect(body).not.toHaveProperty('order');
            });
        }
    } finally {
        await guestRequest.dispose();
    }
});

test('API rejects staff access to order history and details', async ({ request, playwright, orderProduct }) => {
    const productId = orderProduct.id;
    const quantity = 1;
    const baseURL = requiredEnv('UI_BASE_URL');
    const email = requiredEnv('STAFF_EMAIL');
    const password = requiredEnv('STAFF_PASSWORD');

    const cart = await addCartItem(request, productId, quantity);
    const order = await placeOrder(request, cart);
    const orderId = order.id;

    const staffRequest = await playwright.request.newContext({
        baseURL,
        storageState: {
            cookies: [],
            origins: [],
        },
    });

    try {
        const loginResponse = await signInViaApi(staffRequest, email, password);

        expect(loginResponse.status()).toBe(200);

        const endpoints = [
            '/api/orders',
            `/api/orders/${orderId}`,
        ];

        for (const endpoint of endpoints) {
            await test.step(`GET ${endpoint} rejects staff access`, async () => {
                const response = await staffRequest.get(endpoint);

                expect(response.status()).toBe(403);

                const contentType = response.headers()['content-type'];
                const mediaType = contentType?.split(';')[0].trim().toLowerCase();

                expect(mediaType).toBe('application/json');

                const body: ApiErrorResponse = await response.json();

                expect(body).toMatchObject({
                    error: {
                        code: 'FORBIDDEN',
                        message: 'This area is available to customers only.',
                    },
                    requestId: expect.any(String),
                });

                expect(body).not.toHaveProperty('items');
                expect(body).not.toHaveProperty('order');
            });
        }
    } finally {
        await staffRequest.dispose();
    }
});
