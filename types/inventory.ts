import type { CatalogProduct } from './catalog';

export interface InventoryProduct extends CatalogProduct {
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