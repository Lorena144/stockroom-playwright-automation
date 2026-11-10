import { test, expect } from '@playwright/test';
import { requiredEnv } from '../../utils/env';
import { getCsrfToken, signInViaApi } from '../../utils/api-auth';
import type { InventoryResponse } from '../../types/inventory';
import type { ApiErrorResponse } from '../../types/api';
import { randomUUID } from 'node:crypto';

test('customer can sign in through the API and use the session', async ({ request }) => {
    const email = requiredEnv('CUSTOMER_EMAIL');
    const password = requiredEnv('CUSTOMER_PASSWORD');

    const loginResponse = await signInViaApi(request, email, password);
    expect(loginResponse.status()).toBe(200);

    const loginBody = await loginResponse.json();
    expect(loginBody).toMatchObject({
        "user": {
            "id": expect.any(String),
            "email": email,
            "name": expect.any(String),
            "role": "customer"
        },
        "csrfToken": expect.any(String)
    });

    const sessionResponse = await request.get('/api/auth/session');
    expect(sessionResponse.status()).toBe(200);

    const sessionBody = await sessionResponse.json();
    expect(sessionBody).toEqual({
        user: loginBody.user
    });
});

test('staff can sign in through the API and use the session', async ({ request }) => {
    const email = requiredEnv('STAFF_EMAIL');
    const password = requiredEnv('STAFF_PASSWORD');

    const loginResponse = await signInViaApi(request, email, password);
    expect(loginResponse.status()).toBe(200);

    const loginBody = await loginResponse.json();
    expect(loginBody).toMatchObject({
        "user": {
            "id": expect.any(String),
            "email": email,
            "name": expect.any(String),
            "role": "staff"
        },
        "csrfToken": expect.any(String)
    });

    const sessionResponse = await request.get('/api/auth/session');
    expect(sessionResponse.status()).toBe(200);

    const sessionBody = await sessionResponse.json();
    expect(sessionBody).toEqual({
        user: loginBody.user
    });
});

test('customer cannot retrieve staff inventory through the API', async ({ request }) => {
    const email = requiredEnv('CUSTOMER_EMAIL');
    const password = requiredEnv('CUSTOMER_PASSWORD');

    const loginResponse = await signInViaApi(request, email, password);
    expect(loginResponse.status()).toEqual(200);

    const loginBody = await loginResponse.json();
    expect(loginBody.user.role).toEqual('customer');

    const inventoryResponse = await request.get('/api/inventory');
    expect(inventoryResponse.status()).toEqual(403);
    expect(inventoryResponse.headers()['content-type']).toContain('application/json');

    const inventoryBody = await inventoryResponse.json();
    expect(inventoryBody).toMatchObject(
        {
            error: {
                code: "FORBIDDEN",
                message: "This area is available to operations staff only."
            },
            requestId: expect.any(String)
        }
    );
});

test('staff can retrieve inventory with supplier and cost information', async ({ request }) => {
    const email = requiredEnv('STAFF_EMAIL');
    const password = requiredEnv('STAFF_PASSWORD');

    const loginResponse = await signInViaApi(request, email, password);
    expect(loginResponse.status()).toEqual(200);

    const loginBody = await loginResponse.json();
    expect(loginBody.user.role).toBe('staff');

    const inventoryResponse = await request.get('/api/inventory');
    expect(inventoryResponse.status()).toBe(200);
    expect(inventoryResponse.headers()['content-type']).toContain('application/json');

    const inventoryBody: InventoryResponse = await inventoryResponse.json();
    expect(Array.isArray(inventoryBody.items)).toBe(true);
    expect(inventoryBody.items.length).toBeGreaterThan(0);

    for (const item of inventoryBody.items) {
        expect(item).toMatchObject({
            id: expect.any(String),
            sku: expect.any(String),
            name: expect.any(String),
            costCents: expect.any(Number),
            supplier: expect.any(String),
        });

        expect(Number.isInteger(item.costCents)).toBe(true);
        expect(item.costCents).toBeGreaterThanOrEqual(0);
    }
});

test('API rejects incorrect credentials without creating a session', async ({ request }) => {
    const unknownEmail = `unknown-${randomUUID()}@stockroom.test`;

    const loginResponse = await signInViaApi(request, unknownEmail, "InvalidPassword123!");
    expect(loginResponse.status()).toBe(401);
    expect(loginResponse.headers()['content-type']).toContain('application/json');

    const loginBody: ApiErrorResponse = await loginResponse.json();
    expect(loginBody).toMatchObject({
        error: {
            code: "INVALID_CREDENTIALS",
            message: "The email or password is incorrect."
        },
        requestId: expect.any(String)
    });

    expect(loginBody).not.toHaveProperty('user');

    const sessionResponse = await request.get('/api/auth/session');
    expect(sessionResponse.status()).toBe(401);
});

test('API rejects a login payload with a missing password', async ({ request }) => {
    const email = requiredEnv('CUSTOMER_EMAIL');
    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const loginResponse = await request.post('/api/auth/login', {
        headers: {
            origin: origin,
            'X-CSRF-Token': csrfToken,
        },
        data: {
            email,
        },
    });

    expect(loginResponse.status()).toBe(422);
    expect(loginResponse.headers()['content-type']).toContain('application/json');

    const loginBody: ApiErrorResponse = await loginResponse.json();

    expect(loginBody).toMatchObject({
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Check your email and password.',
            fields: {
                password: expect.arrayContaining([expect.any(String)]),
            },
        },
        requestId: expect.any(String),
    });

    expect(loginBody).not.toHaveProperty('user');

    const sessionResponse = await request.get('/api/auth/session');
    expect(sessionResponse.status()).toBe(401);
});

test('API rejects a login payload with an invalid email format', async ({ request }) => {
    const invalidEmail = 'not-an-email';
    const password = requiredEnv('CUSTOMER_PASSWORD');

    const loginResponse = await signInViaApi(request, invalidEmail, password);
    expect(loginResponse.status()).toBe(422);
    expect(loginResponse.headers()['content-type']).toContain('application/json');

    const loginBody: ApiErrorResponse = await loginResponse.json();
    expect(loginBody).toMatchObject({
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Check your email and password.',
            fields: {
                email: expect.arrayContaining([expect.any(String)])
            },
        },
        requestId: expect.any(String),
    });

    expect(loginBody).not.toHaveProperty('user');

    const sessionResponse = await request.get('/api/auth/session');
    expect(sessionResponse.status()).toBe(401);
});

test('API rejects login when the CSRF token header is missing', async ({ request }) => {
    const email = requiredEnv('CUSTOMER_EMAIL');
    const password = requiredEnv('CUSTOMER_PASSWORD');
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    const csrfToken = await getCsrfToken(request);

    const cookies = await request.cookies();
    const csrfCookie = cookies.find(
        (cookie) => cookie.name === 'stockroom_csrf'
    );

    expect(csrfCookie?.value).toBe(csrfToken);

    const loginResponse = await request.post('/api/auth/login', {
        headers: {
            Origin: origin,
        },
        data: {
            email,
            password,
        },
    });

    expect(loginResponse.status()).toBe(403);
    expect(loginResponse.headers()['content-type']).toContain('application/json');

    const loginBody: ApiErrorResponse = await loginResponse.json();
    expect(loginBody).toMatchObject({
        error: {
            code: 'CSRF_INVALID',
            message: 'Refresh your session and try again.',
        },
        requestId: expect.any(String),
    });

    expect(loginBody).not.toHaveProperty('user');

    const sessionResponse = await request.get('/api/auth/session');
    expect(sessionResponse.status()).toBe(401);
});

test('API rejects login from an untrusted Origin', async ({ request }) => {
    const email = requiredEnv('CUSTOMER_EMAIL');
    const password = requiredEnv('CUSTOMER_PASSWORD');
    const untrustedOrigin = 'https://untrusted.example';

    const csrfToken = await getCsrfToken(request);

    const cookies = await request.cookies();
    const csrfCookie = cookies.find(
        (cookie) => cookie.name === 'stockroom_csrf'
    );

    expect(csrfCookie?.value).toBe(csrfToken);

    const loginResponse = await request.post('/api/auth/login', {
        headers: {
            Origin: untrustedOrigin,
            'X-CSRF-Token': csrfToken,
        },
        data: {
            email,
            password,
        },
    });

    expect(loginResponse.status()).toBe(403);
    expect(loginResponse.headers()['content-type']).toContain('application/json');

    const loginBody: ApiErrorResponse = await loginResponse.json();
    expect(loginBody).toMatchObject({
        error: {
            code: 'ORIGIN_REJECTED',
            message: 'This request must come from the application origin.',
        },
        requestId: expect.any(String),
    });

    expect(loginBody).not.toHaveProperty('user');

    const sessionResponse = await request.get('/api/auth/session');
    expect(sessionResponse.status()).toBe(401);
});

test('API logout revokes the signed-in session', async ({ request, playwright }) => {
    const email = requiredEnv('CUSTOMER_EMAIL');
    const password = requiredEnv('CUSTOMER_PASSWORD');
    const baseURL = requiredEnv('UI_BASE_URL');
    const origin = new URL(baseURL).origin;

    const loginResponse = await signInViaApi(request, email, password);
    expect(loginResponse.status()).toBe(200);

    const signedInState = await request.storageState();
    const savedSessionRequest = await playwright.request.newContext({
        baseURL,
        storageState: signedInState,
    });

    try {
        const beforeLogoutResponse = await savedSessionRequest.get('/api/auth/session');
        expect(beforeLogoutResponse.status()).toBe(200);

        const csrfToken = await getCsrfToken(request);
        const logoutResponse = await request.post('/api/auth/logout', {
            headers: {
                Origin: origin,
                'X-CSRF-Token': csrfToken,
            },
        });

        expect(logoutResponse.status()).toBe(204);
        expect(await logoutResponse.text()).toBe('');

        const cookiesAfterLogout = await request.cookies();
        const sessionCookieAfterLogout = cookiesAfterLogout.find(
            (cookie) => cookie.name === 'stockroom_session'
        );

        expect(sessionCookieAfterLogout).toBeUndefined();

        const sessionResponse = await request.get('/api/auth/session');
        expect(sessionResponse.status()).toBe(401);

        const replayResponse = await savedSessionRequest.get('/api/auth/session');
        expect(replayResponse.status()).toBe(401);

        const replayBody: ApiErrorResponse = await replayResponse.json();
        expect(replayBody.error.code).toBe('UNAUTHENTICATED');

    } finally {
        await savedSessionRequest.dispose();
    }
});
