export interface CartItem {
    productId: string;
    sku: string;
    name: string;
    art: string;
    color: string;
    quantity: number;
    stock: number;
    unitPriceCents: number;
    addedPriceCents: number;
    subtotalCents: number;
    priceChanged: boolean;
    available: boolean;
}

export interface Cart {
    version: number;
    currency: 'EUR';
    items: CartItem[];
    itemCount: number;
    totalQuantity: number;
    totalCents: number;
    canCheckout: boolean;
    checkoutToken: string;
}

export interface CartResponse {
    cart: Cart;
}