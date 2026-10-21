/**
 * Merchant products domain (M-C / WP-5B).
 *
 * Fields mirror docs/06_DATABASE.md §21 exactly: name_ar, description_ar,
 * price (nullable), stock_quantity (nullable), image_url (nullable),
 * status. There is NO category field in the backend product model — the
 * earlier client-only category chips silently lost their value, so they
 * are removed here rather than invented (no new taxonomy).
 *
 * Display rules:
 * - price shown ONLY when provided (nullable),
 * - stock/SKU/sales/views/revenue: NOT invented — absent entirely,
 * - image: an OPTIONAL `image_url` persisted through the existing
 *   contract (no upload/storage infrastructure is introduced),
 * - status: active | suspended.
 */

export type MerchantProductStatus = 'active' | 'suspended';

export interface MerchantProduct {
  readonly id: string;
  readonly nameAr: string;
  readonly descriptionAr: string;
  /** Persisted `image_url` (nullable). */
  readonly imageUrl: string | null;
  /** True when an image URL is stored (drives the placeholder copy). */
  readonly hasImage: boolean;
  readonly price: number | null;
  readonly stockQuantity: number | null;
  readonly status: MerchantProductStatus;
  readonly statusLabelAr: string;
}

export interface MerchantProductFilters {
  readonly query: string;
  readonly status: MerchantProductStatus | null;
}

export const EMPTY_PRODUCT_FILTERS: MerchantProductFilters = {
  query: '',
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

/** Deterministic simple text matching + status facet (unit-tested). */
export function filterMerchantProducts(
  products: ReadonlyArray<MerchantProduct>,
  filters: MerchantProductFilters,
): ReadonlyArray<MerchantProduct> {
  const q = filters.query.trim();
  return products.filter((p) => {
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
  readonly price: number | null;
  /** Persisted inventory count. Null = unspecified (nullable server field). */
  readonly stockQuantity: number | null;
  /** Optional product image URL (existing `image_url` field). Empty = none. */
  readonly imageUrl: string;
}

export const EMPTY_PRODUCT_DRAFT: MerchantProductDraft = {
  nameAr: '',
  descriptionAr: '',
  price: null,
  stockQuantity: null,
  imageUrl: '',
};

export function draftFromProduct(product: MerchantProduct): MerchantProductDraft {
  return {
    nameAr: product.nameAr,
    descriptionAr: product.descriptionAr,
    price: product.price,
    stockQuantity: product.stockQuantity,
    imageUrl: product.imageUrl ?? '',
  };
}

export function validateProductDraft(
  draft: MerchantProductDraft,
): Partial<Record<'nameAr' | 'descriptionAr' | 'price' | 'stockQuantity' | 'imageUrl', string>> {
  const errors: Partial<
    Record<'nameAr' | 'descriptionAr' | 'price' | 'stockQuantity' | 'imageUrl', string>
  > = {};
  if (draft.nameAr.trim().length < 3) errors.nameAr = 'أدخل اسم المنتج (٣ أحرف على الأقل)';
  if (draft.descriptionAr.trim().length < 10) {
    errors.descriptionAr = 'أدخل وصف المنتج (١٠ أحرف على الأقل)';
  }
  if (draft.price !== null && (draft.price < 0 || draft.price > 1_000_000)) {
    errors.price = 'أدخل سعرًا صحيحًا بين ٠ و ١٠٠٠٠٠٠';
  }
  if (
    draft.stockQuantity !== null &&
    (!Number.isInteger(draft.stockQuantity) ||
      draft.stockQuantity < 0 ||
      draft.stockQuantity > 1_000_000)
  ) {
    errors.stockQuantity = 'أدخل كمية صحيحة بين ٠ و ١٠٠٠٠٠٠';
  }
  const imageUrl = draft.imageUrl.trim();
  if (imageUrl.length > 0) {
    if (!/^https?:\/\/\S+$/u.test(imageUrl)) {
      errors.imageUrl = 'أدخل رابط صورة صحيحًا يبدأ بـ http';
    } else if (imageUrl.length > 512) {
      errors.imageUrl = 'رابط الصورة طويل جدًا';
    }
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
  /** WP-5C: permanent, ownership-scoped deletion (docs/07 §17). */
  deleteProduct(input: { role: 'merchant'; productId: string }): Promise<void>;
}
