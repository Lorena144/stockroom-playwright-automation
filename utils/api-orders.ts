import { expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type { Cart } from '../types/cart';
import type { Order, OrderPlacementResponse } from '../types/orders';
import { getCsrfToken } from './api-auth';
import { requiredEnv } from './env';

export async function placeOrder(
    request: APIRequestContext,
    cart: Cart,
): Promise<Order> {
    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;
    const idempotencyKey = randomUUID();

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

    const body: OrderPlacementResponse = await response.json();
    expect(body.replayed).toBe(false);

    return body.order;
}