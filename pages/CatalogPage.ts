import type { Locator, Page } from '@playwright/test';

export class CatalogPage {
    private readonly page: Page;

    readonly heading: Locator;
    readonly accountMenu: Locator;
    readonly signOutButton: Locator;
    readonly searchInput: Locator;
    readonly searchButton: Locator;
    readonly productCards: Locator;
    readonly productTitles: Locator;
    readonly productPrices: Locator;
    readonly resultsSummary: Locator;
    readonly emptyResultsHeading: Locator;
    readonly clearFiltersButton: Locator;
    readonly clearSearchButton: Locator;
    readonly resetFiltersButton: Locator;
    readonly categorySelect: Locator;
    readonly availabilitySelect: Locator;
    readonly sortSelect: Locator;
    readonly pageSizeSelect: Locator;
    readonly collectionHeading: Locator;
    readonly productCount: Locator;
    readonly exploreCollectionLink: Locator;
    readonly pagination: Locator;
    readonly previousPageButton: Locator;
    readonly nextPageButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.heading = page.getByRole('heading', {
            name: 'Good tools. Better workdays.',
            exact: true
        });

        this.accountMenu = page.locator('.account-menu');
        this.signOutButton = page.getByRole('button', {
            name: 'Sign out',
            exact: true
        });

        this.collectionHeading = page.locator('#collection-title');
        this.productCount = this.collectionHeading.getByTestId('product-count');
        this.exploreCollectionLink = page.getByRole('link', {
            name: 'Explore the collection',
            exact: true
        });

        this.searchInput = page.getByLabel('Search products', {
            exact: true
        });

        this.searchButton = page.getByRole('button', {
            name: 'Search',
            exact: true
        });

        this.productCards = page.getByTestId('product-card');
        this.productTitles = this.productCards.getByRole('heading', { level: 3 });
        this.productPrices = page.locator('.product-title-row strong');
        this.resultsSummary = page.getByTestId('catalog-results');
        this.emptyResultsHeading = page.getByRole('heading', {
            name: 'No products found.',
            exact: true
        });

        this.clearFiltersButton = page.getByTestId('empty-results').getByRole('button', {
            name: 'Clear filters',
            exact: true
        });

        this.clearSearchButton = page.getByRole('button', {
            name: 'Clear search',
            exact: true
        });

        this.resetFiltersButton = page.getByRole('button', {
            name: 'Reset filters',
            exact: true
        });

        this.categorySelect = page.getByLabel('Category', { exact: true });
        this.availabilitySelect = page.getByLabel('Availability', { exact: true });
        this.sortSelect = page.getByLabel('Sort by', { exact: true });
        this.pageSizeSelect = page.getByLabel('Per page', { exact: true });

        this.pagination = page.getByRole('navigation', {
            name: 'Product pagination',
            exact: true
        });

        this.previousPageButton = this.pagination.getByRole('button', {
            name: 'Previous page',
            exact: true
        });

        this.nextPageButton = this.pagination.getByRole('button', {
            name: 'Next page',
            exact: true
        });
    }

    async goto() {
        await this.page.goto('/catalog');
    }

    async searchFor(query: string) {
        await this.searchInput.fill(query);
        await this.searchButton.click();
    }

    pageButton(pageNumber: number): Locator {
        return this.pagination.getByRole('button', {
            name: `Page ${pageNumber}`,
            exact: true
        });
    }

    productLink(productName: string): Locator {
        return this.productCards.getByRole('link', {
            name: productName,
            exact: true
        });
    }
}