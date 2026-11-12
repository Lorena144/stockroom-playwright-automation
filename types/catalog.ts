export interface CatalogProduct {
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
}

export interface CatalogResponse {
    items: CatalogProduct[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ProductDetailsResponse {
    product: CatalogProduct;
}

export interface CategoriesResponse {
    items: {
        name: string;
        count: number;
    }[];
}