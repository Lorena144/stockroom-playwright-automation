import { test as base, expect } from '@playwright/test';
import { setTimeout as delay } from 'node:timers/promises';
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
                let loginResponse = await signInViaApi(
                    authRequest,
                    requiredEnv('CUSTOMER_EMAIL'),
                    requiredEnv('CUSTOMER_PASSWORD'),
                );

                if (loginResponse.status() === 429) {
                    const retryAfterSeconds = Number(
                        loginResponse.headers()['retry-after'],
                    );

                    if (
                        !Number.isInteger(retryAfterSeconds) ||
                        retryAfterSeconds < 1 ||
                        retryAfterSeconds > 60
                    ) {
                        throw new Error(
                            'Login setup requires Retry-After between 1 and 60 seconds.',
                        );
                    }

                    await delay((retryAfterSeconds + 1) * 1_000);

                    loginResponse = await signInViaApi(
                        authRequest,
                        requiredEnv('CUSTOMER_EMAIL'),
                        requiredEnv('CUSTOMER_PASSWORD'),
                    );
                }

                expect(loginResponse.status()).toBe(200);

                const state = await authRequest.storageState();

                await use(state);
            } finally {
                await authRequest.dispose();
            }
        },
        { scope: 'worker', timeout: 90_000 },
    ],
});

export { expect };