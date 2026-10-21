/**
 * M-C / WP-5 tests: product fixture determinism, filtering/search,
 * lookup, unknown id, empty/error seeds, display rules (nullable price,
 * documented statuses only, image via `image_url`).
 */

import { describe, expect, it } from 'vitest';

import {
  EMPTY_PRODUCT_FILTERS,
  PRODUCT_STATUS_OPTIONS,
  filterMerchantProducts,
  findMerchantProduct,
} from './merchant-product-types';
import { MockMerchantProductsDataSource } from './mock-merchant-products-data-source';
import { useMerchantProductsViewModel } from './use-merchant-products-view-model';

async function loadProducts(mode: 'success' | 'failing' | 'empty' = 'success') {
  return new MockMerchantProductsDataSource(mode).getProducts({ role: 'merchant' });
}

describe('product fixture (deterministic, documented scope)', () => {
  it('returns identical data on repeated calls', async () => {
    const first = await loadProducts();
    const second = await loadProducts();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.length).toBeGreaterThan(0);
  });

  it('covers active + suspended statuses with Arabic labels', async () => {
    const products = await loadProducts();
    expect(products.some((p) => p.status === 'active')).toBe(true);
    expect(products.some((p) => p.status === 'suspended')).toBe(true);
    for (const p of products) {
      expect(['active', 'suspended']).toContain(p.status);
      expect(p.statusLabelAr).toBe(p.status === 'active' ? 'نشط' : 'موقوف');
    }
  });

  it('covers image/no-image, long Arabic text, and nullable price', async () => {
    const products = await loadProducts();
    expect(products.some((p) => p.hasImage)).toBe(true);
    expect(products.some((p) => !p.hasImage)).toBe(true);
    expect(products.some((p) => p.nameAr.length > 40)).toBe(true);
    expect(products.some((p) => p.descriptionAr.length > 100)).toBe(true);
    expect(products.some((p) => p.price === null)).toBe(true);
    expect(products.some((p) => p.price !== null)).toBe(true);
  });

  it('carries no invented ecommerce fields', async () => {
    const products = await loadProducts();
    for (const p of products) {
      // `stockQuantity` IS a documented backend field (docs/06 §21) — allowed.
      expect(JSON.stringify(p)).not.toContain('sku');
      expect(JSON.stringify(p)).not.toContain('sales');
      expect(JSON.stringify(p)).not.toContain('views');
      expect(JSON.stringify(p)).not.toContain('likes');
      expect(JSON.stringify(p)).not.toContain('revenue');
    }
  });

  it('exposes the view-model hook', () => {
    expect(typeof useMerchantProductsViewModel).toBe('function');
  });
});

describe('filtering + search', () => {
  it('filters by status and free text', async () => {
    const products = await loadProducts();

    const byStatus = filterMerchantProducts(products, { ...EMPTY_PRODUCT_FILTERS, status: 'suspended' });
    expect(byStatus.every((p) => p.status === 'suspended')).toBe(true);

    const byText = filterMerchantProducts(products, { ...EMPTY_PRODUCT_FILTERS, query: 'سامسونج' });
    expect(byText.map((p) => p.id)).toEqual(['mp-001']);
  });

  it('combines facets and can yield empty results', async () => {
    const products = await loadProducts();
    const combined = filterMerchantProducts(products, {
      ...EMPTY_PRODUCT_FILTERS,
      query: 'سامسونج',
      status: 'suspended',
    });
    expect(combined).toHaveLength(0);
  });

  it('exposes status filter options matching the documented model', () => {
    expect(PRODUCT_STATUS_OPTIONS.map((o) => o.value)).toEqual([null, 'active', 'suspended']);
  });
});

describe('lookup + unknown id', () => {
  it('finds products by id and misses cleanly', async () => {
    const products = await loadProducts();
    expect(findMerchantProduct(products, 'mp-001')?.nameAr).toContain('غسالة');
    expect(findMerchantProduct(products, 'nope')).toBeNull();
  });
});

describe('empty + error seeds', () => {
  it('returns an empty catalog deterministically (empty-state QA)', async () => {
    expect(await loadProducts('empty')).toHaveLength(0);
  });

  it('fails deterministically with a user-safe message (error QA)', async () => {
    await expect(loadProducts('failing')).rejects.toThrow('تعذر تحميل المنتجات');
  });
});
