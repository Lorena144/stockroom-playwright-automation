export interface OrderSummary {
    id: string;
    number: string;
    status: string;
    currency: string;
    totalCents: number;
    itemCount: number;
    totalQuantity: number;
    createdAt: string;
}

export interface OrderHistoryResponse {
    items: OrderSummary[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface OrderItem {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
}

export interface Order extends OrderSummary {
    items: OrderItem[];
}

export interface OrderPlacementResponse {
    order: Order;
    replayed: boolean;
}