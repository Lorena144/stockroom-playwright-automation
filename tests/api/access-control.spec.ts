import { test, expect } from '@playwright/test';
import type { ApiErrorResponse } from '../../types/api';
import { signInViaApi } from '../../utils/api-auth';
import { requiredEnv } from '../../utils/env';

test.use({
    storageState: {
        cookies: [],
        origins: [],
    },
});

test('session endpoint rejects a request without signing in', async ({ request }) => {
    const response = await request.get('/api/auth/session');

    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(body).toMatchObject({
        error: {
            code: 'UNAUTHENTICATED',
            message: 'Please sign in to continue.',
        },
        requestId: expect.any(String),
    });
    expect(body).not.toHaveProperty('user');
});

test('catalog endpoint rejects a request without signing in', async ({ request }) => {
    const response = await request.get('/api/products');

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
});

test('product details endpoint rejects a request without signing in', async ({ request }) => {
    const productId = 'arc-keyboard';

    const response = await request.get(`/api/products/${productId}`);

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

    expect(body).not.toHaveProperty('product');
});

test('categories endpoint rejects a request without signing in', async ({ request }) => {
    const response = await request.get('/api/categories');

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
});

test('inventory endpoint rejects a request without signing in', async ({ request }) => {
    const response = await request.get('/api/inventory');

    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(body).toMatchObject({
        error: {
            code: 'UNAUTHENTICATED',
            message: 'Please sign in to continue.',
        },
        requestId: expect.any(String),
    });
    expect(body).not.toHaveProperty('items');
});

test('API rejects unauthenticated access to the cart', async ({ request }) => {
    const response = await request.get('/api/cart');
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

    expect(body).not.toHaveProperty('cart');
});

test('API rejects staff access to the cart', async ({ request }) => {
    const email = requiredEnv('STAFF_EMAIL');
    const password = requiredEnv('STAFF_PASSWORD');

    const loginResponse = await signInViaApi(request, email, password);
    expect(loginResponse.status()).toBe(200);

    const response = await request.get('/api/cart');
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

    expect(body).not.toHaveProperty('cart');
});