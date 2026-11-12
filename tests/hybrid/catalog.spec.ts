import { test, expect } from '../../fixtures/catalog.fixture';
import { CatalogPage } from '../../pages/CatalogPage';
import { ProductDetailsPage } from '../../pages/ProductDetailsPage';
import type { CatalogResponse, ProductDetailsResponse } from '../../types/catalog';

test('catalog category results match the API response', async ({ page, request }) => {
    const catalogPage = new CatalogPage(page);
    const category = 'Audio';

    const response = await request.get('/api/products', {
        params: {
            category,
        }
    });

    expect(response.status()).toBe(200);

    const body: CatalogResponse = await response.json();

    expect(body.items.length).toBeGreaterThan(0);

    const expectedTitles = body.items.map((product) => product.name);

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.categorySelect.selectOption({ label: category });

    await expect(catalogPage.productTitles).toHaveText(expectedTitles);
    await expect(catalogPage.productCount).toHaveText(String(body.total));
});

test('product details match the API response', async ({ page, request }) => {
    const catalogPage = new CatalogPage(page);
    const productDetailsPage = new ProductDetailsPage(page);
    const productId = 'arc-keyboard';

    const response = await request.get(`/api/products/${productId}`);
    expect(response.status()).toBe(200);

    const body: ProductDetailsResponse = await response.json();
    const product = body.product;

    const expectedPrice = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
    }).format(product.priceCents / 100);

    await catalogPage.goto();
    await expect(catalogPage.productCards.first()).toBeVisible();

    await catalogPage.searchFor(product.sku);

    await expect(catalogPage.productTitles).toHaveText([product.name]);

    await catalogPage.productLink(product.name).click();

    await expect(page).toHaveURL(`/products/${product.id}`);

    await expect(productDetailsPage.heading).toHaveText(product.name);
    await expect(productDetailsPage.description).toHaveText(product.description);
    await expect(productDetailsPage.sku).toHaveText(product.sku);
    await expect(productDetailsPage.price).toHaveText(expectedPrice);
});