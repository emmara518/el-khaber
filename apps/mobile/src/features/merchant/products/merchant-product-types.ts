/**
 * Merchant products domain (M-C) — display-only catalog.
 *
 * Fields mirror docs/06_DATABASE.md §21 (name_ar, description_ar,
 * price nullable, image_url nullable, status) plus the approved
 * appliance-only category chips. Display rules:
 * - price shown ONLY when the fixture provides it (nullable),
 * - stock/SKU/sales/views/revenue: NOT invented — absent entirely,
 * - image: deterministic local placeholder (no external URLs),
 * - status: active | suspended (matches M-A summary semantics).
 */

export type MerchantProductStatus = 'active' | 'suspended';

export interface MerchantProduct {
  readonly id: string;
  readonly nameAr: string;
  readonly descriptionAr: string;
  readonly categoryAr: string;
  readonly priceSar: number | null;
  readonly hasImage: boolean;
  readonly status: MerchantProductStatus;
  readonly statusLabelAr: string;
}

export const MERCHANT_PRODUCT_CATEGORIES: ReadonlyArray<string> = [
  'غسالات',
  'ثلاجات',
  'تكييفات',
  'لوازم وقطع غيار',
];

export interface MerchantProductFilters {
  readonly query: string;
  readonly category: string | null;
  readonly status: MerchantProductStatus | null;
}

export const EMPTY_PRODUCT_FILTERS: MerchantProductFilters = {
  query: '',
  category: null,
  status: null,
};

export const PRODUCT_STATUS_OPTIONS: ReadonlyArray<{
  value: MerchantProductStatus | null;
  labelAr: string;
}> = [
  { value: null, labelAr: 'الكل' },
  { value: 'active', labelAr: 'نشط' },
  { value: 'suspended', labelAr: 'موقوف' },
];

/** Deterministic simple text matching + facets (unit-tested). */
export function filterMerchantProducts(
  products: ReadonlyArray<MerchantProduct>,
  filters: MerchantProductFilters,
): ReadonlyArray<MerchantProduct> {
  const q = filters.query.trim();
  return products.filter((p) => {
    if (filters.category !== null && p.categoryAr !== filters.category) return false;
    if (filters.status !== null && p.status !== filters.status) return false;
    if (q.length > 0 && !`${p.nameAr} ${p.descriptionAr}`.includes(q)) return false;
    return true;
  });
}

export function findMerchantProduct(
  products: ReadonlyArray<MerchantProduct>,
  id: string,
): MerchantProduct | null {
  return products.find((p) => p.id === id) ?? null;
}

export const PRODUCT_STATUS_LABELS: Record<MerchantProductStatus, string> = {
  active: 'نشط',
  suspended: 'موقوف',
};

/** Editable subset — id/status/labels are system-owned. */
export interface MerchantProductDraft {
  readonly nameAr: string;
  readonly descriptionAr: string;
  readonly categoryAr: string;
  readonly priceSar: number | null;
  /** Typed image INTENT (M-C placeholder system) — no upload pipeline. */
  readonly imageSelected: boolean;
}

export const EMPTY_PRODUCT_DRAFT: MerchantProductDraft = {
  nameAr: '',
  descriptionAr: '',
  categoryAr: '',
  priceSar: null,
  imageSelected: false,
};

export function draftFromProduct(product: MerchantProduct): MerchantProductDraft {
  return {
    nameAr: product.nameAr,
    descriptionAr: product.descriptionAr,
    categoryAr: product.categoryAr,
    priceSar: product.priceSar,
    imageSelected: product.hasImage,
  };
}

export function validateProductDraft(
  draft: MerchantProductDraft,
): Partial<Record<'nameAr' | 'descriptionAr' | 'categoryAr' | 'priceSar', string>> {
  const errors: Partial<Record<'nameAr' | 'descriptionAr' | 'categoryAr' | 'priceSar', string>> = {};
  if (draft.nameAr.trim().length < 3) errors.nameAr = 'أدخل اسم المنتج (٣ أحرف على الأقل)';
  if (draft.descriptionAr.trim().length < 10) {
    errors.descriptionAr = 'أدخل وصف المنتج (١٠ أحرف على الأقل)';
  }
  if (draft.categoryAr.trim().length === 0) errors.categoryAr = 'اختر قسم المنتج';
  if (draft.priceSar !== null && (draft.priceSar < 0 || draft.priceSar > 1_000_000)) {
    errors.priceSar = 'أدخل سعرًا صحيحًا بين ٠ و ١٠٠٠٠٠٠';
  }
  return errors;
}

export class ProductMutationError extends Error {
  constructor(message = 'تعذر تحديث المنتج. حاول مجددًا') {
    super(message);
    this.name = 'ProductMutationError';
  }
}

export interface MerchantProductDataSource {
  getProducts(input: { role: 'merchant' }): Promise<ReadonlyArray<MerchantProduct>>;
  createProduct(input: { role: 'merchant'; draft: MerchantProductDraft }): Promise<MerchantProduct>;
  updateProduct(input: { role: 'merchant'; productId: string; draft: MerchantProductDraft }): Promise<MerchantProduct>;
  setProductStatus(input: { role: 'merchant'; productId: string; status: MerchantProductStatus }): Promise<MerchantProduct>;
}
