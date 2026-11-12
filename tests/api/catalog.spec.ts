import { test, expect } from '../../fixtures/catalog.fixture';
import type { ApiErrorResponse } from '../../types/api';
import type {
    CatalogResponse,
    ProductDetailsResponse,
    CategoriesResponse
} from '../../types/catalog';

test('API search returns the product matching its SKU', async ({ request }) => {
    const sku = 'SR-101';

    const response = await request.get('/api/products', {
        params: {
            q: sku,
        }
    });

    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');


    const body: CatalogResponse = await response.json();
    expect(body).toMatchObject({
        total: 1,
        page: 1,
        pageSize: 6,
        totalPages: 1
    });

    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
        id: 'arc-keyboard',
        sku,
        name: 'Arc mechanical keyboard',
        category: 'Accessories',
        priceCents: 12900,
        stock: 18,
    });
});

test('API accepts a 100-character search query with no matches', async ({ request }) => {
    const maxQueryLength = 100;
    const query = 'a'.repeat(maxQueryLength);

    const response = await request.get('/api/products', {
        params: {
            q: query,
        }
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CatalogResponse = await response.json();
    expect(body.items).toEqual([]);
    expect(body).toMatchObject({
        total: 0,
        page: 1,
        pageSize: 6,
        totalPages: 1,
    });
});

test('API rejects a search query longer than 100 characters', async ({ request }) => {
    const maxQueryLength = 100;
    const invalidQuery = 'a'.repeat(maxQueryLength + 1);

    const response = await request.get('/api/products', {
        params: {
            q: invalidQuery,
        },
    });

    expect(response.status()).toBe(422);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the supplied filters.',
            fields: {
                q: expect.arrayContaining([expect.any(String)]),
            },
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('items');
});

test('API category filter returns matching products: Audio', async ({ request }) => {
    const category = 'Audio';
    const expectedSkus = [
        'SR-107',
        'SR-113',
        'SR-118',
        'SR-121',
    ];

    const response = await request.get('/api/products', {
        params: {
            category,
        }
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CatalogResponse = await response.json();
    expect(body).toMatchObject({
        total: expectedSkus.length,
        page: 1,
        pageSize: 6,
        totalPages: 1
    });

    const actualSkus = body.items.map((product) => product.sku);
    expect(actualSkus).toEqual(expectedSkus);

    for (const product of body.items) {
        expect(product.category).toBe(category);
    }
});

test('API rejects an unsupported category', async ({ request }) => {
    const invalidCategory = 'Gaming';

    const response = await request.get('/api/products', {
        params: {
            category: invalidCategory,
        }
    });

    expect(response.status()).toBe(422);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();
    expect(body).toMatchObject({
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the supplied filters.',
            fields: {
                category: expect.arrayContaining([expect.any(String)]),
            },
        },
        requestId: expect.any(String),
    });
    expect(body).not.toHaveProperty('items');
});

test('API availability filter returns matching products: In stock', async ({ request }) => {
    const allResponse = await request.get('/api/products', {
        params: {
            pageSize: 24,
        }
    });
    expect(allResponse.status()).toBe(200);

    const allBody: CatalogResponse = await allResponse.json();

    expect(allBody.items).toHaveLength(allBody.total);
    expect(allBody.items.some((product) => product.stock === 0)).toBe(true);

    const expectedIds = allBody.items
        .filter((product) => product.stock > 0)
        .map((product) => product.id);

    expect(expectedIds.length).toBeGreaterThan(0);

    const response = await request.get('/api/products', {
        params: {
            stock: 'available',
            pageSize: 24
        }
    });

    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CatalogResponse = await response.json();
    expect(body).toMatchObject({
        total: expectedIds.length,
        page: 1, pageSize: 24,
        totalPages: 1
    });

    const actualIds = body.items.map((product) => product.id);
    expect(actualIds).toEqual(expectedIds);

    for (const product of body.items) {
        expect(Number.isInteger(product.stock)).toBe(true);
        expect(product.stock).toBeGreaterThan(0);
    }
});

test('API availability filter returns matching products: Out of stock', async ({ request }) => {
    const expectedSkus = [
        'SR-104',
        'SR-112',
        'SR-120',
    ];

    const response = await request.get('/api/products', {
        params: {
            stock: 'out',
            pageSize: 24
        }
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();
    expect(mediaType).toBe('application/json');

    const body: CatalogResponse = await response.json();

    expect(body).toMatchObject({
        total: expectedSkus.length,
        page: 1,
        pageSize: 24,
        totalPages: 1
    });

    const actualSkus = body.items.map((product) => product.sku);
    expect(actualSkus).toEqual(expectedSkus);

    for (const product of body.items) {
        expect(product.stock).toBe(0);
    }
});

test('API availability filter returns matching products: Low stock', async ({ request }) => {
    const expectedSkus = [
        'SR-102',
        'SR-106',
        'SR-111',
        'SR-117',
        'SR-121',
        'SR-122',
    ];

    const response = await request.get('/api/products', {
        params: {
            stock: 'low',
            pageSize: 24,
        }
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CatalogResponse = await response.json();

    expect(body).toMatchObject({
        total: expectedSkus.length,
        page: 1,
        pageSize: 24,
        totalPages: 1,
    });

    const actualSkus = body.items.map((product) => product.sku);

    expect(actualSkus).toEqual(expectedSkus);

    for (const product of body.items) {
        expect(Number.isInteger(product.stock)).toBe(true);
        expect(product.stock).toBeGreaterThanOrEqual(1);
        expect(product.stock).toBeLessThanOrEqual(5);
    }
});

test('API rejects an unsupported availability value', async ({ request }) => {
    const response = await request.get('/api/products', {
        params: {
            stock: 'unsupported',
        }
    });

    expect(response.status()).toBe(422);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();
    expect(body).toMatchObject({
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the supplied filters.',
            fields: {
                stock: expect.arrayContaining([expect.any(String)]),
            },
        },
        requestId: expect.any(String)
    });

    expect(body).not.toHaveProperty('items');
});

test('API stock sorting orders products: Low to high', async ({ request }) => {
    const expectedProducts = [
        { sku: 'SR-121', stock: 5 },
        { sku: 'SR-107', stock: 12 },
        { sku: 'SR-113', stock: 14 },
        { sku: 'SR-118', stock: 22 },
    ];

    const response = await request.get('/api/products', {
        params: {
            category: 'Audio',
            sort: 'stock-asc'
        }
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CatalogResponse = await response.json();

    expect(body).toMatchObject({
        total: expectedProducts.length,
        page: 1,
        pageSize: 6,
        totalPages: 1
    });

    const actualProducts = body.items.map((product) => ({
        sku: product.sku,
        stock: product.stock
    }));

    expect(actualProducts).toEqual(expectedProducts);
});

test('API rejects an unsupported sort option', async ({ request }) => {
    const invalidSort = 'unsupported';

    const response = await request.get('/api/products', {
        params: {
            sort: invalidSort,
        }
    });

    expect(response.status()).toBe(422);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();
    expect(body).toMatchObject({
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the supplied filters.',
            fields: {
                sort: expect.arrayContaining([expect.any(String)]),
            },
        },
        requestId: expect.any(String),
    });
    expect(body).not.toHaveProperty('items');
});

test('API returns the default catalog page', async ({ request }) => {
    const expectedNames = [
        'Arc mechanical keyboard',
        'Beam desk lamp',
        'Canvas desk mat',
        'Clarity webcam',
        'Contour wireless mouse',
        'Dock USB C hub',
    ];

    const response = await request.get('/api/products');
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CatalogResponse = await response.json();

    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(6);
    expect(Number.isInteger(body.total)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(expectedNames.length);
    expect(body.totalPages).toBe(Math.ceil(body.total / body.pageSize));

    const actualNames = body.items.map((product) => product.name);
    expect(actualNames).toEqual(expectedNames);

    for (const product of body.items) {
        expect(product).not.toHaveProperty('costCents');
        expect(product).not.toHaveProperty('supplier');
    }
});

test('API returns empty items for a page beyond the last page', async ({ request }) => {
    const initialResponse = await request.get('/api/products');
    expect(initialResponse.status()).toBe(200);

    const initialBody: CatalogResponse = await initialResponse.json();
    expect(initialBody.items.length).toBeGreaterThan(0);

    const requestedPage = initialBody.totalPages + 1;

    const response = await request.get('/api/products', {
        params: {
            page: requestedPage,
            pageSize: initialBody.pageSize
        }
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CatalogResponse = await response.json();

    expect(body.items).toEqual([]);
    expect(body).toMatchObject({
        total: initialBody.total,
        page: requestedPage,
        pageSize: initialBody.pageSize,
        totalPages: initialBody.totalPages
    });
});

test('API rejects page zero', async ({ request }) => {
    const response = await request.get('/api/products', {
        params: {
            page: 0,
        }
    });

    expect(response.status()).toBe(422);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();
    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();
    expect(body).toMatchObject({
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the supplied filters.',
            fields: {
                page: expect.arrayContaining([expect.any(String)]),
            },
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('items');
});

test('API page size controls the number of returned products: 12', async ({ request }) => {
    const pageSize = 12;

    const response = await request.get('/api/products', {
        params: {
            pageSize,
        }
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CatalogResponse = await response.json();

    expect(body.total).toBeGreaterThan(pageSize);
    expect(body.items).toHaveLength(pageSize);
    expect(body).toMatchObject({
        page: 1,
        pageSize
    });
    expect(body.totalPages).toEqual(Math.ceil(body.total / body.pageSize));
});

test('API rejects an unsupported page size', async ({ request }) => {
    const invalidPageSize = 10;

    const response = await request.get('/api/products', {
        params: {
            pageSize: invalidPageSize,
        }
    });

    expect(response.status()).toBe(422);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();
    expect(body).toMatchObject({
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the supplied filters.',
            fields: {
                pageSize: expect.arrayContaining([expect.any(String)]),
            },
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('items');
});

test('API returns details for an existing product', async ({ request }) => {
    const productId = 'arc-keyboard';

    const response = await request.get(`/api/products/${productId}`);

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ProductDetailsResponse = await response.json();

    expect(body.product).toMatchObject({
        id: productId,
        sku: 'SR-101',
        name: 'Arc mechanical keyboard',
        category: 'Accessories',
        description: expect.stringMatching(/\S/),
        priceCents: 12900,
        stock: 18,
        art: expect.any(String),
        color: expect.any(String),
        specs: {
            Layout: '75 percent ANSI',
            Connection: 'USB C and Bluetooth',
            Switches: 'Silent tactile',
        },
    });

    expect(body.product).not.toHaveProperty('costCents');
    expect(body.product).not.toHaveProperty('supplier');
});

test('API returns 404 for a nonexistent product', async ({ request }) => {
    const missingProductId = 'nonexistent-product';

    const response = await request.get(`/api/products/${missingProductId}`);

    expect(response.status()).toBe(404);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'This product could not be found.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('product');
});

test('API returns category counts for the full catalog', async ({ request }) => {
    const expectedCategories = [
        { name: 'Accessories', count: 8 },
        { name: 'Audio', count: 4 },
        { name: 'Computers', count: 3 },
        { name: 'Displays', count: 3 },
        { name: 'Workspace', count: 6 },
    ];

    const response = await request.get('/api/categories');

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: CategoriesResponse = await response.json();

    const actualCategories = body.items.map((category) => ({
        name: category.name,
        count: category.count
    }));

    expect(actualCategories).toHaveLength(expectedCategories.length);
    expect(actualCategories).toEqual(expect.arrayContaining(expectedCategories));

    const totalFromCategories = body.items.reduce(
        (total, category) => total + category.count,
        0
    );

    const productsResponse = await request.get('/api/products');

    expect(productsResponse.status()).toBe(200);

    const productsBody: CatalogResponse = await productsResponse.json();

    expect(productsBody.total).toBe(totalFromCategories);
});

test('API rejects an unknown query parameter', async ({ request }) => {
    const response = await request.get('/api/products', {
        params: {
            unknownFilter: 'test',
        }
    });

    expect(response.status()).toBe(422);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the supplied filters.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('items');
});

test('API rejects repeated query parameters', async ({ request }) => {
    const params = new URLSearchParams();

    params.append('q', 'SR-101');
    params.append('q', 'SR-107');

    const response = await request.get('/api/products', {
        params,
    });

    expect(response.status()).toBe(422);

    const contentType = response.headers()['content-type'];
    const mediaType = contentType?.split(';')[0].trim().toLowerCase();

    expect(mediaType).toBe('application/json');

    const body: ApiErrorResponse = await response.json();

    expect(body).toMatchObject({
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Query parameters must not be repeated.',
        },
        requestId: expect.any(String),
    });

    expect(body).not.toHaveProperty('items');
});