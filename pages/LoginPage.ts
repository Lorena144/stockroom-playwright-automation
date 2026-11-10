import type { Locator, Page } from '@playwright/test';

export class LoginPage {
    private readonly page: Page;

    readonly heading: Locator;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly signInButton: Locator;
    readonly passwordToggleButton: Locator;
    readonly errorMessage: Locator;

    constructor(page: Page) {
        this.page = page;

        this.heading = page.getByRole('heading', {
            name: 'Good to see you.',
            exact: true,
        });
        this.emailInput = page.getByLabel('Email address', { exact: true });
        this.passwordInput = page.getByLabel('Password', { exact: true });
        this.signInButton = page.getByRole('button', {
            name: 'Sign in',
            exact: true
        });
        this.passwordToggleButton = page.getByRole('button', {
            name: /^(Show|Hide) password$/
        });
        this.errorMessage = page.getByTestId('login-error');
    }

    async goto() {
        await this.page.goto('/login');
    }

    async signIn(email: string, password: string) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.signInButton.click();
    }
}