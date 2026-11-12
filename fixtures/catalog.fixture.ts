import { test as base, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { signInViaApi } from '../utils/api-auth';
import { requiredEnv } from '../utils/env';

type CatalogWorkerFixtures = {
    catalogStorageState: Awaited<ReturnType<APIRequestContext['storageState']>>;
};

export const test = base.extend<{}, CatalogWorkerFixtures>({
    storageState: async ({ catalogStorageState }, use) => {
        await use(catalogStorageState);
    },

    catalogStorageState: [
        async ({ playwright }, use) => {
            const authRequest = await playwright.request.newContext({
                baseURL: requiredEnv('UI_BASE_URL'),
            });

            try {
                const loginResponse = await signInViaApi(
                    authRequest,
                    requiredEnv('CUSTOMER_EMAIL'),
                    requiredEnv('CUSTOMER_PASSWORD'),
                );

                expect(loginResponse.status()).toBe(200);

                const state = await authRequest.storageState();

                await use(state);
            } finally {
                await authRequest.dispose();
            }
        },
        { scope: 'worker' },
    ],
});

export { expect };