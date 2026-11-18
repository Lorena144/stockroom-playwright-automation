import { expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import type { Cart, CartResponse } from '../types/cart';
import { getCsrfToken } from './api-auth';
import { requiredEnv } from './env';

export async function clearCart(request: APIRequestContext): Promise<void> {
    const response = await request.get('/api/cart');
    expect(response.status()).toBe(200);

    const body: CartResponse = await response.json();

    if (body.cart.items.length === 0) {
        return;
    }

    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    for (const item of body.cart.items) {
        const deleteResponse = await request.delete(`/api/cart/items/${item.productId}`, {
            headers: {
                Origin: origin,
                'X-CSRF-Token': csrfToken,
            }
        });
        expect(deleteResponse.status()).toBe(200);
    }
}

export async function addCartItem(
    request: APIRequestContext,
    productId: string,
    quantity = 1
): Promise<Cart> {
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
        }
    });

    expect(response.status()).toBe(200);
    const body: CartResponse = await response.json();

    return body.cart;
}