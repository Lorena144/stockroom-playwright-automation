import { test, expect } from '../../fixtures/catalog.fixture';
import type { CartResponse } from '../../types/cart';
import type { ProductDetailsResponse } from '../../types/catalog';
import type { ApiErrorResponse } from '../../types/api';
import { getCsrfToken } from '../../utils/api-auth';
import { clearCart, addCartItem } from '../../utils/api-cart';
import { requiredEnv } from '../../utils/env';
import { setDemoProductStock } from '../../utils/demo-product';

test.beforeEach(async ({ request }) => {
    await clearCart(request);
});

test.afterEach(async ({ request }) => {
    await clearCart(request);
});

test('API returns an empty cart', async ({ request }) => {
    const response = await request.get('/api/cart');
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CartResponse = await response.json();

    expect(body.cart).toMatchObject({
        currency: 'EUR',
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        totalCents: 0,
        canCheckout: false,
    });

    expect(Number.isInteger(body.cart.version)).toBe(true);
    expect(body.cart.version).toBeGreaterThanOrEqual(0);
    expect(body.cart.checkoutToken).toMatch(/^[a-f0-9]{64}$/);
});

test('API adds a product to the cart',
    { tag: '@smoke' },
    async ({ request }) => {
        const productId = 'arc-keyboard';
        const quantity = 2;

        const productResponse = await request.get(`/api/products/${productId}`);
        expect(productResponse.status()).toBe(200);

        const productBody: ProductDetailsResponse = await productResponse.json();
        const product = productBody.product;

        expect(product.id).toBe(productId);
        expect(product.stock).toBeGreaterThanOrEqual(quantity);

        const expectedTotalCents = product.priceCents * quantity;
        const csrfToken = await getCsrfToken(request);
        const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

        const response = await request.post('/api/cart/items', {
            headers: {
                Origin: origin,
                'X-CSRF-Token': csrfToken,
            },
            data: {
                productId,
                quantity,
            },
        });

        expect(response.status()).toBe(200);

        const contentType = response.headers()['content-type'];
        const mediaType = contentType?.split(';')[0].trim().toLowerCase();

        expect(mediaType).toBe('application/json');

        const body: CartResponse = await response.json();

        expect(body.cart.items).toHaveLength(1);
        expect(body.cart.items[0]).toMatchObject({
            productId,
            sku: product.sku,
            name: product.name,
            quantity,
            stock: product.stock,
            unitPriceCents: product.priceCents,
            addedPriceCents: product.priceCents,
            subtotalCents: expectedTotalCents,
            priceChanged: false,
            available: true,
        });

        expect(body.cart).toMatchObject({
            currency: 'EUR',
            itemCount: 1,
            totalQuantity: quantity,
            totalCents: expectedTotalCents,
            canCheckout: true,
        });

        const savedResponse = await request.get('/api/cart');
        expect(savedResponse.status()).toBe(200);

        const savedBody: CartResponse = await savedResponse.json();

        expect(savedBody.cart.items).toEqual(body.cart.items);
        expect(savedBody.cart.totalCents).toBe(expectedTotalCents);
    });

test('API adds units to an existing cart item without creating a duplicate line', async ({ request }) => {
    const productId = 'arc-keyboard';
    const initialQuantity = 2;
    const additionalQuantity = 3;
    const expectedQuantity = initialQuantity + additionalQuantity;

    const initialCart = await addCartItem(request, productId, initialQuantity);

    expect(initialCart.items).toHaveLength(1);

    const initialItem = initialCart.items[0];

    expect(initialItem.productId).toBe(productId);
    expect(initialItem.quantity).toBe(initialQuantity);
    expect(initialItem.stock).toBeGreaterThanOrEqual(expectedQuantity);

    const expectedTotalCents = initialItem.unitPriceCents * expectedQuantity;
    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const response = await request.post('/api/cart/items', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
        data: {
            productId,
            quantity: additionalQuantity,
        },
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CartResponse = await response.json();

    expect(body.cart.items).toHaveLength(1);
    expect(body.cart.items[0]).toMatchObject({
        productId,
        quantity: expectedQuantity,
        unitPriceCents: initialItem.unitPriceCents,
        subtotalCents: expectedTotalCents,
        available: true,
    });

    expect(body.cart).toMatchObject({
        itemCount: 1,
        totalQuantity: expectedQuantity,
        totalCents: expectedTotalCents,
        canCheckout: true,
    });

    const savedResponse = await request.get('/api/cart');

    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();

    expect(savedBody.cart.items).toEqual(body.cart.items);
    expect(savedBody.cart.totalCents).toEqual(expectedTotalCents);
});

test('API updates a cart item quantity and recalculates totals',
    { tag: '@sanity' },
    async ({ request }) => {
        const productId = 'arc-keyboard';
        const initialQuantity = 2;
        const updatedQuantity = 3;

        const initialCart = await addCartItem(request, productId, initialQuantity);
        expect(initialCart.items).toHaveLength(1);

        const initialItem = initialCart.items[0];

        expect(initialItem.productId).toBe(productId);
        expect(initialItem.quantity).toBe(initialQuantity);
        expect(initialItem.stock).toBeGreaterThanOrEqual(updatedQuantity);

        const expectedTotalCents = initialItem.unitPriceCents * updatedQuantity;
        const csrfToken = await getCsrfToken(request);
        const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

        const response = await request.patch(`/api/cart/items/${productId}`, {
            headers: {
                Origin: origin,
                'X-CSRF-Token': csrfToken,
            },
            data: {
                quantity: updatedQuantity,
            },
        });

        expect(response.status()).toBe(200);

        const contentType = response.headers()['content-type'];
        const mediaType = contentType?.split(';')[0].trim().toLowerCase();

        expect(mediaType).toBe('application/json');

        const body: CartResponse = await response.json();

        expect(body.cart.items).toHaveLength(1);
        expect(body.cart.items[0]).toMatchObject({
            productId,
            quantity: updatedQuantity,
            unitPriceCents: initialItem.unitPriceCents,
            subtotalCents: expectedTotalCents,
            available: true,
        });

        expect(body.cart).toMatchObject({
            itemCount: 1,
            totalQuantity: updatedQuantity,
            totalCents: expectedTotalCents,
            canCheckout: true,
        });

        const savedResponse = await request.get('/api/cart');
        expect(savedResponse.status()).toBe(200);

        const savedBody: CartResponse = await savedResponse.json();

        expect(savedBody.cart.items).toEqual(body.cart.items);
        expect(savedBody.cart.totalCents).toBe(expectedTotalCents);
    });

test('API removes one product and preserves the remaining cart item', async ({ request }) => {
    const productToRemove = {
        id: 'arc-keyboard',
        quantity: 2,
    };
    const productToKeep = {
        id: 'canvas-desk-mat',
        quantity: 3,
    };

    await addCartItem(request, productToRemove.id, productToRemove.quantity);
    const initialCart = await addCartItem(request, productToKeep.id, productToKeep.quantity);

    expect(initialCart.items).toHaveLength(2);

    const remainingItem = initialCart.items.find(
        (item) => item.productId === productToKeep.id
    );

    if (!remainingItem) {
        throw new Error(`Setup failed: ${productToKeep.id} was not added to the cart.`);
    }

    expect(remainingItem.quantity).toBe(productToKeep.quantity);

    const expectedTotalCents = remainingItem.unitPriceCents * productToKeep.quantity;
    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const response = await request.delete(`/api/cart/items/${productToRemove.id}`, {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CartResponse = await response.json();

    expect(body.cart.items).toEqual([remainingItem]);
    expect(body.cart).toMatchObject({
        itemCount: 1,
        totalQuantity: productToKeep.quantity,
        totalCents: expectedTotalCents,
        canCheckout: true
    });

    const savedResponse = await request.get('/api/cart');

    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();

    expect(savedBody.cart.items).toEqual([remainingItem]);
    expect(savedBody.cart.totalCents).toBe(expectedTotalCents);
});

test('API removes the last product and leaves an empty cart', async ({ request }) => {
    const productId = 'arc-keyboard';
    const quantity = 2;
    const expectedEmptyCart = {
        currency: 'EUR',
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        totalCents: 0,
        canCheckout: false,
    };

    const initialCart = await addCartItem(request, productId, quantity);
    expect(initialCart.items).toHaveLength(1);
    expect(initialCart.items[0]).toMatchObject({
        productId,
        quantity,
    });

    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const response = await request.delete(`/api/cart/items/${productId}`, {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CartResponse = await response.json();

    expect(body.cart).toMatchObject(expectedEmptyCart);

    const savedResponse = await request.get('/api/cart');
    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();
    expect(savedBody.cart).toMatchObject(expectedEmptyCart);
});

test('API rejects a zero quantity when adding a cart item', async ({ request }) => {
    const productId = 'arc-keyboard';
    const invalidQuantity = 0;

    const initialResponse = await request.get('/api/cart');
    expect(initialResponse.status()).toBe(200);

    const initialBody: CartResponse = await initialResponse.json();

    expect(initialBody.cart.items).toHaveLength(0);

    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const response = await request.post('/api/cart/items', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
        data: {
            productId,
            quantity: invalidQuantity,
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
                quantity: expect.arrayContaining([expect.any(String)]),
            },
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('cart');

    const savedResponse = await request.get('/api/cart');
    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();
    expect(savedBody.cart).toMatchObject({
        version: initialBody.cart.version,
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        totalCents: 0,
        canCheckout: false,
    });
});

test('API rejects a zero quantity update without removing the cart item', async ({ request }) => {
    const productId = 'arc-keyboard';
    const initialQuantity = 2;
    const invalidQuantity = 0;

    const initialCart = await addCartItem(request, productId, initialQuantity);

    expect(initialCart.items).toHaveLength(1);
    expect(initialCart.items[0]).toMatchObject({
        productId,
        quantity: initialQuantity
    });

    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;


    const response = await request.patch(`/api/cart/items/${productId}`, {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
        data: {
            quantity: invalidQuantity,
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
                quantity: expect.arrayContaining([expect.any(String)]),
            },
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('cart');

    const savedResponse = await request.get('/api/cart');
    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();

    expect(savedBody.cart.items).toEqual(initialCart.items);
    expect(savedBody.cart).toMatchObject({
        version: initialCart.version,
        itemCount: 1,
        totalQuantity: initialQuantity,
        totalCents: initialCart.totalCents,
        canCheckout: true,
    });
});

test('API rejects adding units when the combined quantity exceeds stock', async ({ request }) => {
    const productId = 'arc-keyboard';
    const initialQuantity = 1;

    const initialCart = await addCartItem(request, productId, initialQuantity);
    expect(initialCart.items).toHaveLength(1);

    const initialItem = initialCart.items[0];
    expect(initialItem).toMatchObject({
        productId,
        quantity: initialQuantity,
    });
    expect(initialItem.stock).toBeGreaterThanOrEqual(initialQuantity);

    const additionalQuantity = initialItem.stock;
    const combinedQuantity = initialQuantity + additionalQuantity;

    expect(combinedQuantity).toBeLessThanOrEqual(99);

    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const response = await request.post('/api/cart/items', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
        data: {
            productId,
            quantity: additionalQuantity,
        },
    });

    expect(response.status()).toBe(409);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'The requested quantity is no longer available.',
            fields: {
                [productId]: [
                    `Only ${initialItem.stock} units are available. Reduce the quantity or remove this product.`,
                ],
            },
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('cart');

    const savedResponse = await request.get('/api/cart');
    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();

    expect(savedBody.cart.items).toEqual(initialCart.items);
    expect(savedBody.cart).toMatchObject({
        version: initialCart.version,
        itemCount: 1,
        totalQuantity: initialQuantity,
        totalCents: initialCart.totalCents,
        canCheckout: true,
    });
});

test('API rejects a quantity update above stock and preserves the cart', async ({ request }) => {
    const productId = 'arc-keyboard';
    const initialQuantity = 2;

    const initialCart = await addCartItem(request, productId, initialQuantity);

    expect(initialCart.items).toHaveLength(1);

    const initialItem = initialCart.items[0];

    expect(initialItem).toMatchObject({
        productId,
        quantity: initialQuantity,
    });
    expect(initialItem.stock).toBeGreaterThanOrEqual(initialQuantity);

    const invalidQuantity = initialItem.stock + 1;
    expect(invalidQuantity).toBeLessThanOrEqual(99);

    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const response = await request.patch(`/api/cart/items/${productId}`, {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
        data: {
            quantity: invalidQuantity,
        },
    });

    expect(response.status()).toBe(409);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'The requested quantity is no longer available.',
            fields: {
                [productId]: [
                    `Only ${initialItem.stock} units are available. Reduce the quantity or remove this product.`,
                ],
            },
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('cart');

    const savedResponse = await request.get('/api/cart');
    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();

    expect(savedBody.cart.items).toEqual(initialCart.items);
    expect(savedBody.cart).toMatchObject({
        version: initialCart.version,
        itemCount: 1,
        totalQuantity: initialQuantity,
        totalCents: initialCart.totalCents,
        canCheckout: true,
    });
});

test('API rejects adding a nonexistent product to the cart', async ({ request }) => {
    const productId = 'missing-cart-product';
    const quantity = 1;

    const initialResponse = await request.get('/api/cart');
    expect(initialResponse.status()).toBe(200);

    const initialBody: CartResponse = await initialResponse.json();
    expect(initialBody.cart.items).toHaveLength(0);

    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const response = await request.post('/api/cart/items', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
        data: {
            productId,
            quantity,
        },
    });

    expect(response.status()).toBe(404);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();
    expect(body).toMatchObject({
        error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'This product could not be found.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('cart');

    const savedResponse = await request.get('/api/cart');
    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();
    expect(savedBody.cart).toMatchObject({
        version: initialBody.cart.version,
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        totalCents: 0,
        canCheckout: false,
    });
});

test('API rejects updating a product that is not in the cart', async ({ request }) => {
    const cartProductId = 'arc-keyboard';
    const missingCartProductId = 'canvas-desk-mat';
    const initialQuantity = 2;
    const requestedQuantity = 3;

    const initialCart = await addCartItem(request, cartProductId, initialQuantity);
    expect(initialCart.items).toHaveLength(1);
    expect(initialCart.items[0]).toMatchObject({
        productId: cartProductId,
        quantity: initialQuantity,
    });

    const productResponse = await request.get(`/api/products/${missingCartProductId}`);
    expect(productResponse.status()).toBe(200);

    const productBody: ProductDetailsResponse = await productResponse.json();
    expect(productBody.product.id).toBe(missingCartProductId);

    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const response = await request.patch(`/api/cart/items/${missingCartProductId}`, {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
        data: {
            quantity: requestedQuantity,
        },
    });
    expect(response.status()).toBe(404);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();
    expect(body).toMatchObject({
        error: {
            code: 'CART_ITEM_NOT_FOUND',
            message: 'This item could not be found in your cart.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('cart');

    const savedResponse = await request.get('/api/cart');
    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();
    expect(savedBody.cart.items).toEqual(initialCart.items);
    expect(savedBody.cart).toMatchObject({
        version: initialCart.version,
        itemCount: 1,
        totalQuantity: initialQuantity,
        totalCents: initialCart.totalCents,
        canCheckout: true,
    });
});

test('API rejects deleting a cart item that has already been removed', async ({ request }) => {
    const productId = 'arc-keyboard';
    const quantity = 2;

    const initialCart = await addCartItem(request, productId, quantity);

    expect(initialCart.items).toHaveLength(1);
    expect(initialCart.items[0]).toMatchObject({
        productId,
        quantity,
    });

    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const deletedResponse = await request.delete(`/api/cart/items/${productId}`, {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
    });
    expect(deletedResponse.status()).toBe(200);

    const deletedBody: CartResponse = await deletedResponse.json();
    expect(deletedBody.cart.items).toHaveLength(0);

    const response = await request.delete(`/api/cart/items/${productId}`, {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
    });
    expect(response.status()).toBe(404);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'CART_ITEM_NOT_FOUND',
            message: 'This item could not be found in your cart.',
        },
        requestId: expect.any(String),
    });
    expect(body).not.toHaveProperty('cart');

    const savedResponse = await request.get('/api/cart');

    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();

    expect(savedBody.cart).toMatchObject({
        version: deletedBody.cart.version,
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        totalCents: 0,
        canCheckout: false,
    });
});

test('API rejects a quantity greater than 99 when adding a cart item', async ({ request }) => {
    const productId = 'arc-keyboard';
    const maxQuantity = 99;
    const invalidQuantity = maxQuantity + 1;

    const initialResponse = await request.get('/api/cart');
    expect(initialResponse.status()).toBe(200);

    const initialBody: CartResponse = await initialResponse.json();
    expect(initialBody.cart.items).toHaveLength(0);

    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const response = await request.post('/api/cart/items', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
        data: {
            productId,
            quantity: invalidQuantity,
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
                quantity: expect.arrayContaining([expect.any(String)]),
            },
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('cart');

    const savedResponse = await request.get('/api/cart');

    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();

    expect(savedBody.cart).toMatchObject({
        version: initialBody.cart.version,
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        totalCents: 0,
        canCheckout: false,
    });
});

test('API rejects adding a cart item without the CSRF token header', async ({ request }) => {
    const productId = 'arc-keyboard';
    const quantity = 1;
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const initialResponse = await request.get('/api/cart');
    expect(initialResponse.status()).toBe(200);

    const initialBody = await initialResponse.json();
    expect(initialBody.cart.items).toHaveLength(0);

    const csrfToken = await getCsrfToken(request);
    const cookies = await request.cookies();
    const csrfCookie = cookies.find(
        (cookie) => cookie.name === 'stockroom_csrf',
    );

    expect(csrfCookie?.value).toBe(csrfToken);

    const response = await request.post('/api/cart/items', {
        headers: {
            Origin: origin,
        },
        data: {
            productId,
            quantity,
        },
    });

    expect(response.status()).toBe(403);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'CSRF_INVALID',
            message: 'Refresh your session and try again.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('cart');


    const savedResponse = await request.get('/api/cart');

    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();

    expect(savedBody.cart).toMatchObject({
        version: initialBody.cart.version,
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        totalCents: 0,
        canCheckout: false,
    });
});

test('API rejects adding a cart item from an untrusted Origin', async ({ request }) => {
    const productId = 'arc-keyboard';
    const quantity = 1;
    const untrustedOrigin = 'https://untrusted.example';

    const initialResponse = await request.get('/api/cart');
    expect(initialResponse.status()).toBe(200);

    const initialBody: CartResponse = await initialResponse.json();
    expect(initialBody.cart.items).toHaveLength(0);

    const csrfToken = await getCsrfToken(request);
    const cookies = await request.cookies();
    const csrfCookie = cookies.find(
        (cookie) => cookie.name === 'stockroom_csrf',
    );

    expect(csrfCookie?.value).toBe(csrfToken);

    const response = await request.post('/api/cart/items', {
        headers: {
            Origin: untrustedOrigin,
            'X-CSRF-Token': csrfToken,
        },
        data: {
            productId,
            quantity,
        },
    });

    expect(response.status()).toBe(403);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'ORIGIN_REJECTED',
            message: 'This request must come from the application origin.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('cart');
    const savedResponse = await request.get('/api/cart');

    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();

    expect(savedBody.cart).toMatchObject({
        version: initialBody.cart.version,
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        totalCents: 0,
        canCheckout: false,
    });
});

test('API rejects adding units when the combined quantity exceeds 99', async ({ request }) => {
    const productId = 'arc-keyboard';
    const stockForTest = 100;
    const initialQuantity = 99;
    const additionalQuantity = 1;
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    expect(origin).toBe('http://127.0.0.1:3000');

    const productResponse = await request.get(`/api/products/${productId}`);
    expect(productResponse.status()).toBe(200);

    const productBody: ProductDetailsResponse = await productResponse.json();
    const product = productBody.product;

    expect(product.id).toBe(productId);

    try {
        await setDemoProductStock(product.sku, stockForTest);

        const initialCart = await addCartItem(request, productId, initialQuantity);
        expect(initialCart.items).toHaveLength(1);
        expect(initialCart.items[0]).toMatchObject({
            productId,
            quantity: initialQuantity,
            stock: stockForTest
        });

        const csrfToken = await getCsrfToken(request);

        const response = await request.post('/api/cart/items', {
            headers: {
                Origin: origin,
                'X-CSRF-Token': csrfToken,
            },
            data: {
                productId,
                quantity: additionalQuantity,
            },
        });

        expect(response.status()).toBe(422);
        const contentType = response.headers()['content-type'];
        const mediaType = contentType?.split(';')[0].trim().toLowerCase();

        expect(mediaType).toBe('application/json');

        const body: ApiErrorResponse = await response.json();

        expect(body).toMatchObject({
            error: {
                code: 'QUANTITY_LIMIT',
                message: 'A cart can contain at most 99 units of one product.',
            },
            requestId: expect.any(String),
        });

        expect(body).not.toHaveProperty('cart');

        const savedResponse = await request.get('/api/cart');
        expect(savedResponse.status()).toBe(200);

        const savedBody: CartResponse = await savedResponse.json();

        expect(savedBody.cart.items).toEqual(initialCart.items);
        expect(savedBody.cart).toMatchObject({
            version: initialCart.version,
            itemCount: 1,
            totalQuantity: initialQuantity,
            totalCents: initialCart.totalCents,
            canCheckout: true,
        });
    } finally {
        await setDemoProductStock(product.sku, product.stock);
    }

});

test('API rejects query parameters when retrieving the cart', async ({ request }) => {
    const unsupportedUserId = 'another-account';

    const initialResponse = await request.get('/api/cart');
    expect(initialResponse.status()).toBe(200);

    const initialBody: CartResponse = await initialResponse.json();
    expect(initialBody.cart.items).toHaveLength(0);

    const response = await request.get('/api/cart', {
        params: {
            userId: unsupportedUserId,
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
            message: 'This operation does not accept query parameters.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('cart');

    const savedResponse = await request.get('/api/cart');
    expect(savedResponse.status()).toBe(200);

    const savedBody: CartResponse = await savedResponse.json();

    expect(savedBody.cart).toMatchObject({
        version: initialBody.cart.version,
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        totalCents: 0,
        canCheckout: false,
    });
});