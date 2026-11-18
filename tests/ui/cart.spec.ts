import { test, expect } from '../../fixtures/catalog.fixture';
import { CatalogPage } from '../../pages/CatalogPage';
import { CartPage } from '../../pages/CartPage';
import { clearCart, addCartItem } from '../../utils/api-cart';
import { ProductDetailsPage } from '../../pages/ProductDetailsPage';
import type { CatalogResponse, ProductDetailsResponse } from '../../types/catalog';
import { LoginPage } from '../../pages/LoginPage';
import { requiredEnv } from '../../utils/env';

test.beforeEach(async ({ request }) => {
    await clearCart(request);
});

test.afterEach(async ({ request }) => {
    await clearCart(request);
});

test('customer sees an empty cart', async ({ page }) => {
    const cartPage = new CartPage(page);

    await cartPage.goto();

    await expect(page).toHaveURL(/\/cart$/);
    await expect(cartPage.heading).toBeVisible();
    await expect(cartPage.emptyCartHeading).toBeVisible();
    await expect(cartPage.browseProductsLink).toBeVisible();
    await expect(cartPage.cartItems).toHaveCount(0);
    await expect(cartPage.placeOrderButton).toBeHidden();
});

test('customer can add one product to the cart from the catalog', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const cartPage = new CartPage(page);
    const productName = 'Arc mechanical keyboard';

    await catalogPage.goto();
    const productCard = catalogPage.productCard(productName);
    await expect(productCard).toBeVisible();

    const productPrice = await catalogPage.productPrice(productName)
        .innerText();

    await catalogPage.addToCartButton(productName).click();

    await expect(catalogPage.addToCartMessage(productName)).toContainText('1 unit added to your cart.');

    await catalogPage.viewCartLink(productName).click();

    await expect(page).toHaveURL(/\/cart$/);
    await expect(cartPage.heading).toBeVisible();
    await expect(cartPage.cartItems).toHaveCount(1);

    const cartItem = cartPage.item(productName);
    await expect(cartItem).toBeVisible();

    await expect(cartPage.quantityInput(productName)).toHaveValue('1');

    await expect(cartPage.cartItemTotal(productName)).toHaveText(productPrice);
    await expect(cartPage.total).toHaveText(productPrice);
    await expect(cartPage.placeOrderButton).toBeEnabled();
});

test('customer can update a product quantity and cart totals', async ({ page, request }) => {
    const cartPage = new CartPage(page);
    const productId = 'arc-keyboard';
    const productName = 'Arc mechanical keyboard';
    const quantity = 3;

    const cart = await addCartItem(request, productId);
    expect(cart.items).toHaveLength(1);

    const expectedTotal = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR'
    }).format((cart.items[0].unitPriceCents * quantity) / 100);

    await cartPage.goto();
    await expect(cartPage.quantityInput(productName)).toHaveValue('1');

    await (cartPage.quantityInput(productName)).fill(String(quantity));
    await cartPage.updateQuantityButton(productName).click();

    await expect(cartPage.statusMessage).toHaveText('Quantity updated.');
    await expect(cartPage.quantityInput(productName)).toHaveValue(String(quantity));

    await expect(cartPage.cartItemTotal(productName)).toHaveText(expectedTotal);
    await expect(cartPage.total).toHaveText(expectedTotal);

    await page.reload();

    await expect(cartPage.quantityInput(productName)).toHaveValue(String(quantity));
    await expect(cartPage.total).toHaveText(expectedTotal);
});

test('customer can remove the last product from the cart', async ({ page, request }) => {
    const cartPage = new CartPage(page);
    const productId = 'arc-keyboard';
    const productName = 'Arc mechanical keyboard';

    await addCartItem(request, productId, 2);

    await cartPage.goto();
    await expect(cartPage.cartItems).toHaveCount(1);
    await expect(cartPage.quantityInput(productName)).toHaveValue('2');

    await cartPage.removeButton(productName).click();

    await expect(cartPage.statusMessage).toHaveText('Product removed from your cart.');

    await expect(cartPage.cartItems).toHaveCount(0);
    await expect(cartPage.emptyCartHeading).toBeVisible();
    await expect(cartPage.browseProductsLink).toBeVisible();
    await expect(cartPage.total).toBeHidden();
    await expect(cartPage.placeOrderButton).toBeHidden();
});

test('adding the same product increases quantity without duplicate cart lines', async ({ page, request }) => {
    const catalogPage = new CatalogPage(page);
    const cartPage = new CartPage(page);
    const productId = 'arc-keyboard';
    const productName = 'Arc mechanical keyboard';
    const expectedQuantity = 2;

    const cart = await addCartItem(request, productId);
    expect(cart.items).toHaveLength(1);

    const expectedTotal = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR'
    }).format((cart.items[0].unitPriceCents * expectedQuantity) / 100);

    await catalogPage.goto();
    await expect(catalogPage.productCard(productName)).toBeVisible();
    await catalogPage.addToCartButton(productName).click();

    await expect(catalogPage.addToCartMessage(productName)).toContainText(
        '1 unit added to your cart.'
    );

    await catalogPage.viewCartLink(productName).click();

    await expect(page).toHaveURL(/\/cart$/);
    await expect(cartPage.cartItems).toHaveCount(1);
    await expect(cartPage.quantityInput(productName)).toHaveValue(String(expectedQuantity));
    await expect(cartPage.cartItemTotal(productName)).toHaveText(expectedTotal);
    await expect(cartPage.total).toHaveText(expectedTotal);

});

test('removing one product preserves the other product and updates the total', async ({ page, request }) => {
    const cartPage = new CartPage(page);

    const productToRemove = {
        id: 'arc-keyboard',
        name: 'Arc mechanical keyboard',
    };

    const productToKeep = {
        id: 'canvas-desk-mat',
        name: 'Canvas desk mat',
    };

    await addCartItem(request, productToRemove.id, 2);
    const cart = await addCartItem(request, productToKeep.id);

    expect(cart.items).toHaveLength(2);

    const remainingItem = cart.items.find(
        (item) => item.productId === productToKeep.id
    );

    if (!remainingItem) {
        throw new Error('Test setup failed: the product to keep is missing from the cart.');
    }

    const currencyFormatter = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
    });

    const expectedInitialTotal = currencyFormatter.format(
        cart.items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0) / 100,
    );

    const remainingTotal = currencyFormatter.format(
        (remainingItem.unitPriceCents * remainingItem.quantity) / 100,
    );

    await cartPage.goto();

    await expect(cartPage.cartItems).toHaveCount(2);
    await expect(cartPage.quantityInput(productToRemove.name)).toHaveValue('2');
    await expect(cartPage.quantityInput(productToKeep.name)).toHaveValue('1');
    await expect(cartPage.total).toHaveText(expectedInitialTotal);

    await cartPage.removeButton(productToRemove.name).click();

    await expect(cartPage.statusMessage).toHaveText('Product removed from your cart.');
    await expect(cartPage.cartItems).toHaveCount(1);
    await expect(cartPage.item(productToRemove.name)).toBeHidden();
    await expect(cartPage.item(productToKeep.name)).toBeVisible();
    await expect(cartPage.quantityInput(productToKeep.name)).toHaveValue('1');
    await expect(cartPage.cartItemTotal(productToKeep.name)).toHaveText(remainingTotal);
    await expect(cartPage.total).toHaveText(remainingTotal);
    await expect(cartPage.emptyCartHeading).toBeHidden();
    await expect(cartPage.placeOrderButton).toBeEnabled();
});

test('customer can add a chosen quantity from product details', async ({ page, request }) => {
    const productDetailsPage = new ProductDetailsPage(page);
    const cartPage = new CartPage(page);
    const productId = 'arc-keyboard';
    const quantity = 3;

    const response = await request.get(`/api/products/${productId}`);
    expect(response.status()).toBe(200);

    const body: ProductDetailsResponse = await response.json();
    const product = body.product;

    const expectedTotal = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
    }).format((product.priceCents * quantity) / 100);

    await productDetailsPage.goto(productId);
    await expect(productDetailsPage.heading).toHaveText(product.name);

    await productDetailsPage.quantityInput.fill(String(quantity));
    await productDetailsPage.addToCartButton.click();

    await expect(productDetailsPage.statusMessage).toContainText(
        `${quantity} units added to your cart.`
    );

    await productDetailsPage.viewCartLink.click();

    await expect(page).toHaveURL(/\/cart$/);
    await expect(cartPage.cartItems).toHaveCount(1);
    await expect(cartPage.quantityInput(product.name)).toHaveValue(String(quantity));
    await expect(cartPage.cartItemTotal(product.name)).toHaveText(expectedTotal);
    await expect(cartPage.total).toHaveText(expectedTotal);
});

test('cart rejects a quantity greater than the available stock', async ({ page, request }) => {
    const cartPage = new CartPage(page);
    const productId = 'arc-keyboard';
    const productName = 'Arc mechanical keyboard';

    const cart = await addCartItem(request, productId);
    expect(cart.items).toHaveLength(1);

    const stock = cart.items[0].stock;
    const invalidStock = stock + 1;

    expect(invalidStock).toBeLessThanOrEqual(99);

    const expectedTotal = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
    }).format(cart.totalCents / 100);

    await cartPage.goto();
    await expect(cartPage.quantityInput(productName)).toHaveValue('1');
    await expect(cartPage.total).toHaveText(expectedTotal);

    await cartPage.quantityInput(productName).fill(String(invalidStock));
    await cartPage.updateQuantityButton(productName).click();

    await expect(cartPage.errorMessage).toBeVisible();
    await expect(cartPage.errorMessage).toContainText(
        'The requested quantity is no longer available.'
    );

    await expect(cartPage.errorMessage).toContainText(
        `Only ${stock} units are available.`
    );

    await expect(cartPage.cartItemTotal(productName)).toHaveText(expectedTotal);
    await expect(cartPage.total).toHaveText(expectedTotal);

    await page.reload();

    await expect(cartPage.cartItems).toHaveCount(1);
    await expect(cartPage.quantityInput(productName)).toHaveValue('1');
    await expect(cartPage.total).toHaveText(expectedTotal);
});

test('cart rejects a zero quantity without removing the product', async ({ page, request }) => {
    const cartPage = new CartPage(page);
    const productId = 'arc-keyboard';
    const productName = 'Arc mechanical keyboard';

    const cart = addCartItem(request, productId);

    const expectedTotal = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR'
    }).format((await cart).totalCents / 100);

    await cartPage.goto();
    await expect(cartPage.quantityInput(productName)).toHaveValue('1');

    await cartPage.quantityInput(productName).fill('0');
    await cartPage.updateQuantityButton(productName).click();

    expect(await cartPage.isQuantityBelowMinimum(productName)).toBe(true);

    await expect(cartPage.cartItems).toHaveCount(1);
    await expect(cartPage.total).toHaveText(expectedTotal);

    await page.reload();

    await expect(cartPage.quantityInput(productName)).toHaveValue('1');
    await expect(cartPage.total).toHaveText(expectedTotal);
});

test('product details reject a zero quantity without adding a product', async ({ page }) => {
    const productDetailsPage = new ProductDetailsPage(page);
    const cartPage = new CartPage(page);
    const productId = 'arc-keyboard';

    await productDetailsPage.goto(productId);
    await expect(productDetailsPage.addToCartButton).toBeEnabled();

    await productDetailsPage.quantityInput.fill('0');
    await productDetailsPage.addToCartButton.click();

    expect(await productDetailsPage.isQuantityBelowMinimum()).toBe(true);

    await cartPage.goto();

    await expect(cartPage.emptyCartHeading).toBeVisible();
    await expect(cartPage.cartItems).toHaveCount(0);
});

test('out-of-stock products cannot be added from the catalog or product details', async ({ page, request }) => {
    const catalogPage = new CatalogPage(page);
    const productDetailsPage = new ProductDetailsPage(page);

    const response = await request.get('/api/products', {
        params: {
            stock: 'out',
        }
    });
    expect(response.status()).toBe(200);

    const body: CatalogResponse = await response.json();
    expect(body.items.length).toBeGreaterThan(0);

    const product = body.items[0];
    expect(product.stock).toBe(0);

    await catalogPage.goto();
    await expect(catalogPage.productCards).not.toHaveCount(0);

    await catalogPage.searchFor(product.sku);

    await expect(catalogPage.productCard(product.name)).toBeVisible();
    await expect(catalogPage.productAvailability(product.name)).toHaveText('Out of stock');
    await expect(catalogPage.addToCartButton(product.name)).toBeDisabled();

    await catalogPage.productLink(product.name).click();

    await expect(page).toHaveURL(`/products/${product.id}`);
    await expect(productDetailsPage.heading).toHaveText(product.name);
    await expect(productDetailsPage.availability).toHaveText('Out of stock');
    await expect(productDetailsPage.quantityInput).toBeDisabled();
    await expect(productDetailsPage.addToCartButton).toBeDisabled();
});

test('refresh cart loads quantity changes made in another tab', async ({ page, request }) => {
    const cartPage = new CartPage(page);
    const productId = 'arc-keyboard';
    const productName = 'Arc mechanical keyboard';
    const updatedQuantity = 3;

    const cart = await addCartItem(request, productId);
    expect(cart.items).toHaveLength(1);

    const currencyFormatter = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
    });

    const initialTotal = currencyFormatter.format(cart.totalCents / 100);
    const updatedTotal = currencyFormatter.format((cart.items[0].unitPriceCents * updatedQuantity) / 100);

    await cartPage.goto();
    await expect(cartPage.quantityInput(productName)).toHaveValue('1');
    await expect(cartPage.total).toHaveText(initialTotal);

    const secondPage = await page.context().newPage();
    const secondCartPage = new CartPage(secondPage);

    await secondCartPage.goto();
    await expect(secondCartPage.quantityInput(productName)).toHaveValue('1');

    await secondCartPage.quantityInput(productName).fill(String(updatedQuantity));
    await secondCartPage.updateQuantityButton(productName).click();

    await expect(secondCartPage.statusMessage).toHaveText(
        'Quantity updated.'
    );

    await secondPage.close();

    await expect(cartPage.quantityInput(productName)).toHaveValue('1');
    await expect(cartPage.total).toHaveText(initialTotal);

    await cartPage.refreshCartButton.click();

    await expect(cartPage.statusMessage).toHaveText(
        'Cart refreshed. Review the latest prices and availability.'
    );

    await expect(cartPage.cartItems).toHaveCount(1);
    await expect(cartPage.quantityInput(productName)).toHaveValue(String(updatedQuantity));
    await expect(cartPage.cartItemTotal(productName)).toHaveText(updatedTotal);
    await expect(cartPage.total).toHaveText(updatedTotal);

});

test('customer cart is preserved after signing out and signing in', async ({ page, request }) => {
    const cartPage = new CartPage(page);
    const loginPage = new LoginPage(page);
    const productId = 'arc-keyboard';
    const productName = 'Arc mechanical keyboard';
    const quantity = 2;
    const email = requiredEnv('CUSTOMER_EMAIL');
    const password = requiredEnv('CUSTOMER_PASSWORD');

    const cart = await addCartItem(request, productId, quantity);

    const expectedTotal = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
    }).format(cart.totalCents / 100);

    await page.context().clearCookies();

    await loginPage.goto();
    await loginPage.signIn(email, password);

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);

    await cartPage.goto();

    await expect(cartPage.cartItems).toHaveCount(1);
    await expect(cartPage.quantityInput(productName)).toHaveValue(String(quantity));
    await expect(cartPage.total).toHaveText(expectedTotal);

    await cartPage.signOutButton.click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.heading).toBeVisible();

    await loginPage.signIn(email, password);

    await expect(page).toHaveURL(/\/catalog(?:\?.*)?$/);

    await cartPage.goto();


    await expect(cartPage.cartItems).toHaveCount(1);
    await expect(cartPage.quantityInput(productName)).toHaveValue(String(quantity));
    await expect(cartPage.cartItemTotal(productName)).toHaveText(expectedTotal);
    await expect(cartPage.total).toHaveText(expectedTotal);
    await expect(cartPage.placeOrderButton).toBeEnabled();

});