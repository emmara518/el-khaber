/**
 * Real API `MerchantProductsDataSource` (Task 10J).
 *
 * Endpoints (docs/07 §17, merchant-only, ownership from the JWT):
 * - GET /merchant/products (paginated, newest first),
 * - POST /merchant/products (`slug` server-derived from `nameAr`),
 * - PATCH /merchant/products/:id (writable whitelist; status included),
 * - DELETE exists backend-side but the approved UI has no delete
 *   action, so it is intentionally not exposed here.
 *
 * DISCOVERED CONTRACT GAPS (reported, NOT invented around):
 * - product category: the backend product model has NO category field
 *   (docs/06 §21: nameAr/descriptionAr/price/stockQuantity/imageUrl/
 *   status/slug). The UI's category chip therefore cannot persist;
 *   created/updated products keep an empty display category and the
 *   category filter operates on the loaded (real) list only.
 * - product image: the typed `imageSelected` intent has no storage/
 *   media path (docs/07 §9 upload flow unimplemented) → no imageUrl
 *   is ever sent; no fabricated URLs.
 */

import { getApi } from '../../../lib/api-client';
import { toUserMessage } from '../../../lib/api-error';
import { drainPages } from '../../../lib/api-query';

import {
  PRODUCT_STATUS_LABELS,
  ProductMutationError,
  type MerchantProduct,
  type MerchantProductDataSource,
  type MerchantProductDraft,
  type MerchantProductStatus,
} from './merchant-product-types';

import type { MerchantProductDto } from '@khabir/shared-types';

export { ProductMutationError };

const MUTATION_FALLBACK_AR = 'تعذر تحديث المنتج. حاول مجددًا';

export function mapProduct(dto: MerchantProductDto): MerchantProduct {
  return {
    id: dto.id,
    nameAr: dto.nameAr,
    descriptionAr: dto.descriptionAr ?? '',
    // No category field exists in the backend product model (gap).
    categoryAr: '',
    priceSar: dto.price,
    hasImage: dto.imageUrl !== null,
    status: dto.status,
    statusLabelAr: PRODUCT_STATUS_LABELS[dto.status],
  };
}

export class ApiMerchantProductsDataSource implements MerchantProductDataSource {
  async getProducts(_input: { role: 'merchant' }): Promise<ReadonlyArray<MerchantProduct>> {
    const dtos = await drainPages<MerchantProductDto>((page, limit) =>
      getApi()
        .request<MerchantProductDto[]>(
          'GET',
          `/merchant/products?page=${String(page)}&limit=${String(limit)}`,
        )
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    return dtos.map(mapProduct);
  }

  async createProduct(input: {
    role: 'merchant';
    draft: MerchantProductDraft;
  }): Promise<MerchantProduct> {
    const { draft } = input;
    try {
      const res = await getApi().request<MerchantProductDto>('POST', '/merchant/products', {
        nameAr: draft.nameAr.trim(),
        descriptionAr: draft.descriptionAr.trim().length > 0 ? draft.descriptionAr.trim() : undefined,
        price: draft.priceSar ?? undefined,
        // imageUrl: no storage path exists (gap) — never fabricated.
        // category: no backend field exists (gap).
      });
      return mapProduct(res.data);
    } catch (err: unknown) {
      throw new ProductMutationError(toProductMessage(err));
    }
  }

  async updateProduct(input: {
    role: 'merchant';
    productId: string;
    draft: MerchantProductDraft;
  }): Promise<MerchantProduct> {
    const { draft } = input;
    try {
      const res = await getApi().request<MerchantProductDto>(
        'PATCH',
        `/merchant/products/${input.productId}`,
        {
          nameAr: draft.nameAr.trim(),
          descriptionAr: draft.descriptionAr.trim().length > 0 ? draft.descriptionAr.trim() : undefined,
          price: draft.priceSar ?? undefined,
        },
      );
      return mapProduct(res.data);
    } catch (err: unknown) {
      throw new ProductMutationError(toProductMessage(err));
    }
  }

  async setProductStatus(input: {
    role: 'merchant';
    productId: string;
    status: MerchantProductStatus;
  }): Promise<MerchantProduct> {
    try {
      const res = await getApi().request<MerchantProductDto>(
        'PATCH',
        `/merchant/products/${input.productId}`,
        { status: input.status },
      );
      return mapProduct(res.data);
    } catch (err: unknown) {
      throw new ProductMutationError(toProductMessage(err));
    }
  }
}

function toProductMessage(err: unknown): string {
  const message = toUserMessage(err, MUTATION_FALLBACK_AR);
  const code = (err as { code?: unknown }).code;
  if (code === 'CONFLICT') {
    // slug is server-derived from nameAr; a duplicate means the name
    // collides with an existing product slug.
    return 'اسم المنتج يؤدي إلى معرف مستخدم مسبقًا. اختر اسمًا مختلفًا';
  }
  return message;
}

/** Session-scoped shared API instance (same pattern as the mock). */
export const sharedMerchantProductsSource: MerchantProductDataSource =
  new ApiMerchantProductsDataSource();