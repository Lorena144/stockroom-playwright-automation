export interface InventoryProduct {
    id: string;
    sku: string;
    name: string;
    category: 'Accessories' | 'Audio' | 'Computers' | 'Displays' | 'Workspace';
    description: string;
    priceCents: number;
    stock: number;
    art: string;
    color: string;
    specs: Record<string, string>;
    costCents: number;
    supplier: string;
    stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
}

export interface InventoryResponse {
    items: InventoryProduct[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    summary: {
        products: number;
        units: number;
        lowStock: number;
        outOfStock: number;
    };
}