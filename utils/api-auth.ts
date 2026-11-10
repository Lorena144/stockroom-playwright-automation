import type { APIRequestContext, APIResponse } from '@playwright/test';
import { requiredEnv } from './env';

export async function getCsrfToken(request: APIRequestContext): Promise<string> {
    const response = await request.get('/api/auth/csrf');

    if (response.status() !== 200) {
        throw new Error(`Could not obtain a CSRF token. HTTP status: ${response.status()}`);
    }

    const body = await response.json();
    const csrfToken = body?.csrfToken;

    if (typeof csrfToken !== 'string' || csrfToken.length === 0) {
        throw new Error('The CSRF response must contain a nonempty csrfToken string.');
    }
    return csrfToken;
}

export async function signInViaApi(
    request: APIRequestContext,
    email: string,
    password: string,
): Promise<APIResponse> {
    const csrfToken = await getCsrfToken(request);
    const origin = new URL(requiredEnv('UI_BASE_URL')).origin;

    return request.post('/api/auth/login', {
        headers: {
            Origin: origin,
            'X-CSRF-Token': csrfToken,
        },
        data: {
            email,
            password,
        },
    });
}
