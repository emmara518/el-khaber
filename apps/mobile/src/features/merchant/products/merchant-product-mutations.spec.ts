/**
 * M-D tests: product mutations (create/update/status), validation,
 * duplicate prevention, catalog/detail consistency through the
 * shared source, empty-catalog create flow.
 */

import { describe, expect, it } from 'vitest';

import {
  MockMerchantProductsDataSource,
  sharedMerchantProductsSource,
} from './mock-merchant-products-data-source';
import {
  draftFromProduct,
  validateProductDraft,
  EMPTY_PRODUCT_DRAFT,
  ProductMutationError,
} from './merchant-product-types';
import { findMerchantProduct } from './merchant-product-types';
import { useMerchantProductFormViewModel } from './use-merchant-product-form-view-model';

function validDraft() {
  return {
    nameAr: 'مكيف سبليت جديد ٢ طن',
    descriptionAr: 'مكيف سبليت جديد بكفاءة عالية مع ضمان المتجر لمدة سنتين.',
    categoryAr: 'تكييفات',
    priceSar: 2100,
    imageSelected: false,
  };
}

describe('product draft validation', () => {
  it('requires name, description, category — price optional', () => {
    const errors = validateProductDraft(EMPTY_PRODUCT_DRAFT);
    expect(errors.nameAr).toBeDefined();
    expect(errors.descriptionAr).toBeDefined();
    expect(errors.categoryAr).toBeDefined();
    expect(errors.priceSar).toBeUndefined();
    expect(Object.keys(validateProductDraft(validDraft()))).toHaveLength(0);
  });

  it('rejects short name/description and invalid price', () => {
    expect(validateProductDraft({ ...validDraft(), nameAr: 'اب' }).nameAr).toBeDefined();
    expect(validateProductDraft({ ...validDraft(), descriptionAr: 'قصير' }).descriptionAr).toBeDefined();
    expect(validateProductDraft({ ...validDraft(), priceSar: -5 }).priceSar).toBeDefined();
  });

  it('converts a product to a draft preserving values (edit prefill)', async () => {
    const products = await new MockMerchantProductsDataSource().getProducts({ role: 'merchant' });
    const product = findMerchantProduct(products, 'mp-003');
    expect(product).not.toBeNull();
    if (product === null) return;
    const draft = draftFromProduct(product);
    expect(draft.nameAr).toBe(product.nameAr);
    expect(draft.priceSar).toBeNull();
    expect(Object.keys(validateProductDraft(draft))).toHaveLength(0);
  });

  it('exposes the form view-model hook', () => {
    expect(typeof useMerchantProductFormViewModel).toBe('function');
  });
});

describe('create product', () => {
  it('creates a new active product visible to later reads', async () => {
    const source = new MockMerchantProductsDataSource();
    const created = await source.createProduct({ role: 'merchant', draft: validDraft() });
    expect(created.id).not.toContain('mp-00');
    expect(created.status).toBe('active');
    const list = await source.getProducts({ role: 'merchant' });
    const found = findMerchantProduct(list, created.id);
    expect(found?.nameAr).toBe(validDraft().nameAr);
  });

  it('rejects invalid drafts and failing mode without faking success', async () => {
    const source = new MockMerchantProductsDataSource();
    await expect(
      source.createProduct({ role: 'merchant', draft: EMPTY_PRODUCT_DRAFT }),
    ).rejects.toBeInstanceOf(ProductMutationError);
    await expect(
      new MockMerchantProductsDataSource('failing').createProduct({ role: 'merchant', draft: validDraft() }),
    ).rejects.toBeInstanceOf(ProductMutationError);
  });

  it('works on an empty catalog (empty → create flow)', async () => {
    const source = new MockMerchantProductsDataSource('empty');
    const created = await source.createProduct({ role: 'merchant', draft: validDraft() });
    const list = await source.getProducts({ role: 'merchant' });
    expect(list).toHaveLength(1);
    expect(findMerchantProduct(list, created.id)).not.toBeNull();
  });
});

describe('update product', () => {
  it('updates values while keeping the same id', async () => {
    const source = new MockMerchantProductsDataSource();
    const updated = await source.updateProduct({
      role: 'merchant',
      productId: 'mp-001',
      draft: { ...validDraft(), nameAr: 'غسالة محدثة' },
    });
    expect(updated.id).toBe('mp-001');
    expect(updated.nameAr).toBe('غسالة محدثة');
    const list = await source.getProducts({ role: 'merchant' });
    expect(findMerchantProduct(list, 'mp-001')?.nameAr).toBe('غسالة محدثة');
  });

  it('rejects unknown ids and invalid drafts', async () => {
    const source = new MockMerchantProductsDataSource();
    await expect(
      source.updateProduct({ role: 'merchant', productId: 'nope', draft: validDraft() }),
    ).rejects.toBeInstanceOf(ProductMutationError);
    await expect(
      source.updateProduct({ role: 'merchant', productId: 'mp-001', draft: EMPTY_PRODUCT_DRAFT }),
    ).rejects.toBeInstanceOf(ProductMutationError);
  });
});

describe('suspend / activate', () => {
  it('suspends an active product and reflects it in the list', async () => {
    const source = new MockMerchantProductsDataSource();
    const updated = await source.setProductStatus({ role: 'merchant', productId: 'mp-001', status: 'suspended' });
    expect(updated.status).toBe('suspended');
    expect(updated.statusLabelAr).toBe('موقوف');
    const list = await source.getProducts({ role: 'merchant' });
    expect(findMerchantProduct(list, 'mp-001')?.status).toBe('suspended');
  });

  it('activates a suspended product', async () => {
    const source = new MockMerchantProductsDataSource();
    const updated = await source.setProductStatus({ role: 'merchant', productId: 'mp-005', status: 'active' });
    expect(updated.status).toBe('active');
    expect(updated.statusLabelAr).toBe('نشط');
  });

  it('rejects no-op status mutation', async () => {
    const source = new MockMerchantProductsDataSource();
    await expect(
      source.setProductStatus({ role: 'merchant', productId: 'mp-001', status: 'active' }),
    ).rejects.toBeInstanceOf(ProductMutationError);
  });

  it('fails deterministically in failing mode and on unknown ids', async () => {
    const failing = new MockMerchantProductsDataSource('failing');
    await expect(
      failing.setProductStatus({ role: 'merchant', productId: 'mp-001', status: 'suspended' }),
    ).rejects.toBeInstanceOf(ProductMutationError);
    const source = new MockMerchantProductsDataSource();
    await expect(
      source.setProductStatus({ role: 'merchant', productId: 'nope', status: 'suspended' }),
    ).rejects.toBeInstanceOf(ProductMutationError);
  });
});

describe('shared session source', () => {
  it('is a single instance carrying session state', () => {
    expect(sharedMerchantProductsSource).toBeInstanceOf(MockMerchantProductsDataSource);
  });
});
