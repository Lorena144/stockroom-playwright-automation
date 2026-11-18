import { test as base, expect } from './catalog.fixture';
import type { CatalogProduct, ProductDetailsResponse } from '../types/catalog';
import { clearCart } from '../utils/api-cart';
import { requiredEnv } from '../utils/env';
import { setDemoProductStock } from '../utils/demo-product';

type OrderFixtures = {
    orderProduct: CatalogProduct;
};

export const test = base.extend<OrderFixtures>({
    orderProduct: async ({ request }, use) => {
        const baseURL = new URL(requiredEnv('UI_BASE_URL'));

        if (baseURL.origin !== 'http://127.0.0.1:3000') {
            throw new Error('Order stock cleanup requires the local Stockroom application.');
        }

        await clearCart(request);

        const productId = 'arc-keyboard';
        const response = await request.get(`/api/products/${productId}`);

        expect(response.status()).toBe(200);

        const body: ProductDetailsResponse = await response.json();
        const product = body.product;

        expect(product.stock).toBeGreaterThanOrEqual(2);

        try {
            await use(product);
        } finally {
            try {
                await clearCart(request);
            } finally {
                await setDemoProductStock(product.sku, product.stock);
            }
        }
    },
});

export { expect };