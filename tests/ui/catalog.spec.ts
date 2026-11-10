import { test, expect } from '../../fixtures/catalog.fixture';
import { randomUUID } from 'node:crypto';
import { CatalogPage } from '../../pages/CatalogPage';
import { ProductDetailsPage } from '../../pages/ProductDetailsPage';

test('explore the collection scrolls to the catalog', async ({ page }) => {
    const catalogPage = new CatalogPage(page);

    await catalogPage.goto();
    await expect(catalogPage.productCount).toHaveText(/^\d+$/);

    await expect(catalogPage.exploreCollectionLink).toBeInViewport({ ratio: 1 });
    const initialScrollY = await page.evaluate(() => window.scrollY);

    await catalogPage.exploreCollectionLink.click();

    await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(initialScrollY);

    await expect(catalogPage.collectionHeading).toBeInViewport({ ratio: 1 });
});

test('customer can find a product by SKU', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const sku = 'SR-101';

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.searchFor(sku);

    await expect(catalogPage.productCount).toBeVisible();
    await expect(catalogPage.productCount).toHaveText('1');
    await expect(catalogPage.productCards).toHaveCount(1);
    await expect(catalogPage.productTitles).toHaveText('Arc mechanical keyboard');
    await expect(catalogPage.productCards).toContainText(sku);
    await expect(catalogPage.resultsSummary).toContainText('1 product matching');
});

test('customer sees empty results for an unmatched search', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const query = `no-product-${randomUUID()}`;

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.searchFor(query);

    await expect(catalogPage.productCount).toBeVisible();
    await expect(catalogPage.productCount).toHaveText('0');
    await expect(catalogPage.emptyResultsHeading).toBeVisible();
    await expect(catalogPage.productCards).toHaveCount(0);
    await expect(catalogPage.resultsSummary).toContainText('0 products matching');
    await expect(catalogPage.clearFiltersButton).toBeVisible();
});

test('customer can submit a search using Enter', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const sku = 'SR-101';

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.searchInput.fill(sku);
    await catalogPage.searchInput.press('Enter');

    await expect(catalogPage.productCount).toBeVisible();
    await expect(catalogPage.productCount).toHaveText('1');
    await expect(catalogPage.productCards).toHaveCount(1);
    await expect(catalogPage.productTitles).toHaveText('Arc mechanical keyboard');
    await expect(catalogPage.productCards).toContainText(sku);
    await expect(catalogPage.resultsSummary).toContainText('1 product matching');
});

test('customer can search by a partial name ignoring letter case', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const query = 'mEcHaNiCaL';

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.searchFor(query);

    await expect(catalogPage.productCount).toBeVisible();
    await expect(catalogPage.productCount).toHaveText('1');
    await expect(catalogPage.productCards).toHaveCount(1);
    await expect(catalogPage.productTitles).toHaveText('Arc mechanical keyboard');
    await expect(catalogPage.productCards).toContainText('SR-101');
    await expect(catalogPage.resultsSummary).toContainText('1 product matching');
});

test('customer can search with surrounding spaces', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const sku = 'SR-101';

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.searchFor(`   ${sku}   `);

    await expect(catalogPage.productCount).toBeVisible();
    await expect(catalogPage.productCount).toHaveText('1');
    await expect(catalogPage.productCards).toHaveCount(1);
    await expect(catalogPage.productTitles).toHaveText('Arc mechanical keyboard');
    await expect(catalogPage.productCards).toContainText(sku);
    await expect(catalogPage.resultsSummary).toContainText('1 product matching');
});

test('customer can search for a percent sign as literal text', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const query = '%';

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.searchFor(query);

    await expect(catalogPage.productCount).toBeVisible();
    await expect(catalogPage.productCount).toHaveText('0');
    await expect(catalogPage.emptyResultsHeading).toBeVisible();
    await expect(catalogPage.productCards).toHaveCount(0);
    await expect(catalogPage.resultsSummary).toContainText('0 products matching');
    await expect(catalogPage.clearFiltersButton).toBeVisible();
});

test('clearing search preserves the selected category', async ({ page }) => {
    const catalogPage = new CatalogPage(page);

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.categorySelect.selectOption('Accessories');

    await expect(catalogPage.resultsSummary).toContainText('8 products');
    await expect(catalogPage.productCards).toHaveCount(6);

    const categoryTitles = await catalogPage.productTitles.allTextContents();

    await catalogPage.searchFor('SR-101');
    await expect(catalogPage.resultsSummary).toContainText('1 product matching');
    await expect(catalogPage.productCards).toHaveCount(1);
    await expect(catalogPage.productTitles).toHaveText('Arc mechanical keyboard');

    await catalogPage.clearSearchButton.click();

    await expect(catalogPage.productCount).toHaveText('8');
    await expect(catalogPage.searchInput).toHaveValue('');
    await expect(catalogPage.categorySelect).toHaveValue('Accessories');
    await expect(catalogPage.resultsSummary).toContainText('8');
    await expect(catalogPage.resultsSummary).not.toContainText('matching');
    await expect(catalogPage.productCards).toHaveCount(6);
    await expect(catalogPage.productTitles).toHaveText(categoryTitles);
});

test('reset filters restores the catalog defaults', async ({ page }) => {
    const catalogPage = new CatalogPage(page);

    await catalogPage.goto();

    await expect(catalogPage.productCards).toHaveCount(6);
    await expect(catalogPage.productCount).toHaveText(/^\d+$/);

    const defaultProductCount = await catalogPage.productCount.innerText();
    const defaultResultsSummary = await catalogPage.resultsSummary.innerText();
    const defaultTitles = await catalogPage.productTitles.allTextContents();

    await catalogPage.categorySelect.selectOption('Accessories');
    await catalogPage.availabilitySelect.selectOption('available');
    await catalogPage.sortSelect.selectOption('price-desc');
    await catalogPage.pageSizeSelect.selectOption('12');
    await catalogPage.searchFor('SR-101');

    await expect(catalogPage.searchInput).toHaveValue('SR-101');
    await expect(catalogPage.categorySelect).toHaveValue('Accessories');
    await expect(catalogPage.availabilitySelect).toHaveValue('available');
    await expect(catalogPage.sortSelect).toHaveValue('price-desc');
    await expect(catalogPage.pageSizeSelect).toHaveValue('12');
    await expect(catalogPage.productCards).toHaveCount(1);
    await expect(catalogPage.productTitles).toHaveText('Arc mechanical keyboard');

    await catalogPage.resetFiltersButton.click();

    await expect(catalogPage.searchInput).toHaveValue('');
    await expect(catalogPage.categorySelect).toHaveValue('all');
    await expect(catalogPage.availabilitySelect).toHaveValue('all');
    await expect(catalogPage.sortSelect).toHaveValue('name-asc');
    await expect(catalogPage.pageSizeSelect).toHaveValue('6');

    await expect(catalogPage.productCount).toHaveText(defaultProductCount);
    await expect(catalogPage.resultsSummary).toHaveText(defaultResultsSummary);
    await expect(catalogPage.productCards).toHaveCount(6);
    await expect(catalogPage.productTitles).toHaveText(defaultTitles);
});

test('category filter displays only matching products: Audio', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const expectedTitles = [
        'Echo studio headphones',
        'Island desktop speaker',
        'Nest wireless earbuds',
        'Quiet USB microphone',
    ];

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.categorySelect.selectOption('Audio');

    await expect(catalogPage.categorySelect).toHaveValue('Audio');
    await expect(catalogPage.productCount).toBeVisible();
    await expect(catalogPage.productCount).toHaveText(String(expectedTitles.length));
    await expect(catalogPage.productCards).toHaveCount(expectedTitles.length);
    await expect(catalogPage.productTitles).toHaveText(expectedTitles);
    await expect(catalogPage.resultsSummary).toContainText(`${expectedTitles.length} products`);

    for (const card of await catalogPage.productCards.all()) {
        await expect(card.getByText('Audio', { exact: true })).toBeVisible();
    }
});

test('availability filter displays only matching products: Out of stock', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const expectedTitles = [
        'Clarity webcam',
        'Horizon ultrawide monitor',
        'Pivot task light',
    ];

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.availabilitySelect.selectOption('Out of stock');

    await expect(catalogPage.availabilitySelect).toHaveValue('out');
    await expect(catalogPage.productCount).toBeVisible();
    await expect(catalogPage.productCount).toHaveText(String(expectedTitles.length));
    await expect(catalogPage.productCards).toHaveCount(expectedTitles.length);
    await expect(catalogPage.productTitles).toHaveText(expectedTitles);
    await expect(catalogPage.resultsSummary).toContainText(`${expectedTitles.length} products`);

    for (const card of await catalogPage.productCards.all()) {
        await expect(card.getByText('Out of stock', { exact: true })).toBeVisible();
    }
});

test('combined filters display matching products: Accessories + In stock', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const expectedTitles = [
        'Arc mechanical keyboard',
        'Contour wireless mouse',
        'Dock USB C hub',
        'Junction USB C cable',
        'Orbit wireless trackpad',
        'Slate numeric pad',
        'Tide charging pad',
    ];

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.pageSizeSelect.selectOption('12');
    await catalogPage.categorySelect.selectOption({ label: 'Accessories' });
    await catalogPage.availabilitySelect.selectOption({ label: 'In stock' });

    await expect(catalogPage.categorySelect).toHaveValue('Accessories');
    await expect(catalogPage.availabilitySelect).toHaveValue('available');
    await expect(catalogPage.productCount).toBeVisible();
    await expect(catalogPage.productCount).toHaveText(String(expectedTitles.length));
    await expect(catalogPage.productCards).toHaveCount(expectedTitles.length);
    await expect(catalogPage.productTitles).toHaveText(expectedTitles);

    for (const card of await catalogPage.productCards.all()) {
        await expect(card.getByText('Accessories', { exact: true })).toBeVisible();
        await expect(card.locator('.stock-quantity')).toHaveText(/^[1-9]\d* available$/);
    }
});

test('price sorting orders products: Low to high', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const expectedTitles = [
        'Nest wireless earbuds',
        'Island desktop speaker',
        'Quiet USB microphone',
        'Echo studio headphones',
    ];
    const expectedPrices = ['€89.00', '€99.00', '€129.00', '€149.00'];

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.categorySelect.selectOption('Audio');
    await expect(catalogPage.productCards).toHaveCount(expectedTitles.length);

    await catalogPage.sortSelect.selectOption({ label: 'Price: low to high' });

    await expect(catalogPage.categorySelect).toHaveValue('Audio');
    await expect(catalogPage.sortSelect).toHaveValue('price-asc');
    await expect(catalogPage.productCount).toBeVisible();
    await expect(catalogPage.productCount).toHaveText(String(expectedTitles.length));
    await expect(catalogPage.productCards).toHaveCount(expectedTitles.length);
    await expect(catalogPage.productTitles).toHaveText(expectedTitles);
    await expect(catalogPage.productPrices).toHaveText(expectedPrices);
});

test('price sorting orders products: High to low', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const expectedTitles = [
        'Echo studio headphones',
        'Quiet USB microphone',
        'Island desktop speaker',
        'Nest wireless earbuds',
    ];
    const expectedPrices = ['€149.00', '€129.00', '€99.00', '€89.00'];

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.categorySelect.selectOption({ label: 'Audio' });
    await expect(catalogPage.productCards).toHaveCount(expectedTitles.length);

    await catalogPage.sortSelect.selectOption({ label: 'Price: high to low' });

    await expect(catalogPage.sortSelect).toHaveValue('price-desc');
    await expect(catalogPage.categorySelect).toHaveValue('Audio');
    await expect(catalogPage.productCount).toBeVisible();
    await expect(catalogPage.productCount).toHaveText(String(expectedTitles.length));
    await expect(catalogPage.productCards).toHaveCount(expectedTitles.length);
    await expect(catalogPage.productTitles).toHaveText(expectedTitles);
    await expect(catalogPage.productPrices).toHaveText(expectedPrices);
});

test('page size updates results and resets to page 1: 12', async ({ page }) => {
    const catalogPage = new CatalogPage(page);

    await catalogPage.goto();
    await expect(catalogPage.productCards).toHaveCount(6);

    const totalProductCount = await catalogPage.productCount.innerText();
    const firstPageTitles = await catalogPage.productTitles.allTextContents();

    await catalogPage.pageButton(2).click();
    await expect(catalogPage.pageButton(2)).toHaveAttribute('aria-current', 'page');

    await catalogPage.pageSizeSelect.selectOption('12');
    await expect(catalogPage.pageSizeSelect).toHaveValue('12');
    await expect(catalogPage.pageButton(1)).toHaveAttribute('aria-current', 'page');
    await expect(catalogPage.productCards).toHaveCount(12);
    await expect(catalogPage.productTitles).toContainText(firstPageTitles);
    await expect(catalogPage.productCount).toHaveText(totalProductCount);
    await expect(catalogPage.previousPageButton).toBeDisabled();
});

test('pagination preserves category: Next and Previous', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const expectedTitles = [
        'Arc mechanical keyboard',
        'Clarity webcam',
        'Contour wireless mouse',
        'Dock USB C hub',
        'Junction USB C cable',
        'Orbit wireless trackpad',
        'Slate numeric pad',
        'Tide charging pad',
    ];
    const expectedFirstPage = expectedTitles.slice(0, 6);
    const expectedSecondPage = expectedTitles.slice(6);

    await catalogPage.goto();

    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.categorySelect.selectOption({ label: 'Accessories' });

    await expect(catalogPage.productCount).toHaveText(String(expectedTitles.length));
    await expect(catalogPage.productTitles).toHaveText(expectedFirstPage);
    await expect(catalogPage.previousPageButton).toBeDisabled();
    await expect(catalogPage.nextPageButton).toBeEnabled();

    await catalogPage.nextPageButton.click();

    await expect(catalogPage.pageButton(2)).toHaveAttribute('aria-current', 'page');
    await expect(catalogPage.categorySelect).toHaveValue('Accessories');
    await expect(catalogPage.productTitles).toHaveText(expectedSecondPage);
    await expect(catalogPage.productCount).toHaveText(String(expectedTitles.length));
    await expect(catalogPage.previousPageButton).toBeEnabled();
    await expect(catalogPage.nextPageButton).toBeDisabled();

    await catalogPage.previousPageButton.click();

    await expect(catalogPage.pageButton(1)).toHaveAttribute('aria-current', 'page');
    await expect(catalogPage.categorySelect).toHaveValue('Accessories');
    await expect(catalogPage.productTitles).toHaveText(expectedFirstPage);
    await expect(catalogPage.previousPageButton).toBeDisabled();
    await expect(catalogPage.nextPageButton).toBeEnabled();
});

test('combined filters show no matches: SKU and unrelated category', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const sku = 'SR-101';

    await catalogPage.goto();

    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.searchFor(sku);
    await expect(catalogPage.productTitles).toHaveText('Arc mechanical keyboard');

    await catalogPage.categorySelect.selectOption({ label: 'Audio' });

    await expect(catalogPage.categorySelect).toHaveValue('Audio');
    await expect(catalogPage.searchInput).toHaveValue(sku);
    await expect(catalogPage.emptyResultsHeading).toBeVisible();
    await expect(catalogPage.productCount).toHaveText('0');
    await expect(catalogPage.productCards).toHaveCount(0);
});

test('catalog settings and results persist after a refresh', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const expectedTitles = [
        'Dock USB C hub',
        'Junction USB C cable',
    ];
    const inputFilter = 'USB';

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.searchFor(inputFilter);
    await catalogPage.categorySelect.selectOption({ label: 'Accessories' });
    await catalogPage.availabilitySelect.selectOption({ value: 'available' });
    await catalogPage.sortSelect.selectOption({ value: 'price-desc' });
    await catalogPage.pageSizeSelect.selectOption('12');

    await expect(catalogPage.pageSizeSelect).toHaveValue('12');
    await expect(catalogPage.productTitles).toHaveText(expectedTitles);
    await expect(catalogPage.productCount).toHaveText(String(expectedTitles.length));

    await page.reload();

    await expect(catalogPage.searchInput).toHaveValue(inputFilter);
    await expect(catalogPage.categorySelect).toHaveValue('Accessories');
    await expect(catalogPage.availabilitySelect).toHaveValue('available');
    await expect(catalogPage.sortSelect).toHaveValue('price-desc');
    await expect(catalogPage.pageSizeSelect).toHaveValue('12');

    await expect(catalogPage.productTitles).toHaveText(expectedTitles);
    await expect(catalogPage.productCount).toHaveText(String(expectedTitles.length));
});

test('applying a category filter returns to page 1', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const expectedTitles = [
        'Echo studio headphones',
        'Island desktop speaker',
        'Nest wireless earbuds',
        'Quiet USB microphone',
    ];

    await catalogPage.goto();
    await expect(catalogPage.productCards).toHaveCount(6);

    await catalogPage.pageButton(2).click();
    await expect(catalogPage.pageButton(2)).toHaveAttribute('aria-current', 'page');

    await catalogPage.categorySelect.selectOption({ label: 'Audio' });

    await expect(catalogPage.categorySelect).toHaveValue('Audio');
    await expect(catalogPage.pageButton(1)).toHaveAttribute('aria-current', 'page');
    await expect(catalogPage.productTitles).toHaveText(expectedTitles);
    await expect(catalogPage.productCount).toHaveText(String(expectedTitles.length));
    await expect(catalogPage.previousPageButton).toBeDisabled();
    await expect(catalogPage.nextPageButton).toBeDisabled();
});

test('opening a product displays its details', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const productDetailsPage = new ProductDetailsPage(page);
    const productName = 'Arc mechanical keyboard';

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.productLink(productName).click();

    await expect(page).toHaveURL(/\/products\/arc-keyboard\/?$/);
    await expect(productDetailsPage.heading).toHaveText(productName);
    await expect(productDetailsPage.sku).toHaveText('SR-101');
    await expect(productDetailsPage.price).toHaveText('€129.00');
    await expect(productDetailsPage.availability).toHaveText('In stock');
    await expect(productDetailsPage.stockQuantity).toHaveText(
        '18 units currently available.',
    );

    await expect(productDetailsPage.description).toBeVisible();
    await expect(productDetailsPage.description).toHaveText(/\S/);

    await expect(productDetailsPage.specifications.getByRole('term')).toHaveText([
        'Layout',
        'Connection',
        'Switches',
    ]);

    await expect(productDetailsPage.specifications.getByRole('definition')).toHaveText([
        '75 percent ANSI',
        'USB C and Bluetooth',
        'Silent tactile',
    ]);
});
