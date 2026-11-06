import { test, expect } from '@playwright/test';

test('session endpoint rejects a request without signing in', async ({ request }) => {
    const response = await request.get('/api/auth/session');

    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(body).toMatchObject({
        "error": {
            "code": "UNAUTHENTICATED",
            "message": "Please sign in to continue."
        },
        "requestId": expect.any(String),
    });
    expect(body).not.toHaveProperty('user');
});

test('inventory endpoint rejects a request without signing in', async ({ request }) => {
    const response = await request.get('/api/inventory');

    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(body).toMatchObject({
        "error": {
            "code": "UNAUTHENTICATED",
            "message": "Please sign in to continue."
        },
        "requestId": expect.any(String),
    });
    expect(body).not.toHaveProperty('items');

});