import { test, expect } from '../../fixtures/catalog.fixture';
import { CartPage } from '../../pages/CartPage';
import type { CartResponse } from '../../types/cart';
import { addCartItem, clearCart } from '../../utils/api-cart';

test.beforeEach(async ({ request }) => {
    await clearCart(request);
});

test.afterEach(async ({ request }) => {
    await clearCart(request);
});

test('cart quantity updated through the UI matches the API state', async ({ page, request }) => {
    const cartPage = new CartPage(page);
    const productId = 'arc-keyboard';
    const initialQuantity = 1;
    const updatedQuantity = 2;

    const initialCart = await addCartItem(request, productId, initialQuantity);

    expect(initialCart.items).toHaveLength(1);

    const initialItem = initialCart.items[0];
    const productName = initialItem.name;
    const expectedTotalCents = initialItem.unitPriceCents * updatedQuantity;

    expect(initialItem.stock).toBeGreaterThanOrEqual(updatedQuantity);

    await cartPage.goto();

    await expect(cartPage.quantityInput(productName)).toHaveValue(String(initialQuantity));

    await cartPage.quantityInput(productName).fill(String(updatedQuantity));
    await cartPage.updateQuantityButton(productName).click();

    await expect(cartPage.statusMessage).toHaveText('Quantity updated.');

    const response = await request.get('/api/cart');
    expect(response.status()).toBe(200);


    const body: CartResponse = await response.json();
    expect(body.cart.items).toHaveLength(1);

    const item = body.cart.items[0];

    expect(item).toMatchObject({
        productId,
        quantity: updatedQuantity,
        unitPriceCents: initialItem.unitPriceCents,
        subtotalCents: expectedTotalCents,
    });

    expect(body.cart).toMatchObject({
        itemCount: 1,
        totalQuantity: updatedQuantity,
        totalCents: expectedTotalCents,
    });

    const currencyFormatter = new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: body.cart.currency,
    });

    const expectedLineTotal = currencyFormatter.format(item.subtotalCents / 100);
    const expectedCartTotal = currencyFormatter.format(body.cart.totalCents / 100);

    await expect(cartPage.quantityInput(productName)).toHaveValue(String(item.quantity));
    await expect(cartPage.cartItemTotal(productName)).toHaveText(expectedLineTotal);
    await expect(cartPage.total).toHaveText(expectedCartTotal);
});

test('removing a product through the UI leaves an empty cart in the API', async ({ page, request }) => {
    const cartPage = new CartPage(page);
    const productId = 'arc-keyboard';
    const quantity = 1;

    const initialCart = await addCartItem(request, productId, quantity);
    expect(initialCart.items).toHaveLength(1);

    const productName = initialCart.items[0].name;

    await cartPage.goto();

    await expect(cartPage.quantityInput(productName)).toHaveValue(String(quantity));
    await cartPage.removeButton(productName).click();
    await expect(cartPage.statusMessage).toHaveText('Product removed from your cart.');

    const response = await request.get('/api/cart');
    expect(response.status()).toBe(200);

    const body: CartResponse = await response.json();

    expect(body.cart).toMatchObject({
        items: [],
        itemCount: 0,
        totalQuantity: 0,
        totalCents: 0,
        canCheckout: false,
    });

    await expect(cartPage.emptyCartHeading).toBeVisible();
    await expect(cartPage.cartItems).toHaveCount(0);
    await expect(cartPage.placeOrderButton).toBeHidden();
});