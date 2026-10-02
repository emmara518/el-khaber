/**
 * Real API `StoreDataSource` (Phase D).
 *
 * Endpoints (public): GET /products (paginated, active newest first) and
 * GET /products/:id (active detail). Customer and Technician both consume
 * this read contract; neither touches the merchant-scoped management API.
 */

import { getApi, ApiClientError } from '../../lib/api-client';
import { buildQuery, drainPages } from '../../lib/api-query';

import type { StoreDataSource, StoreProduct } from './store-types';
import type { PublicProductDto } from '@khabir/shared-types';

export function mapStoreProduct(dto: PublicProductDto): StoreProduct {
  return {
    id: dto.id,
    nameAr: dto.nameAr,
    descriptionAr: dto.descriptionAr,
    price: dto.price,
    imageUrl: dto.imageUrl,
    merchantNameAr: dto.merchant.businessNameAr,
  };
}

export class ApiStoreDataSource implements StoreDataSource {
  async getProducts(_input: { role: 'customer' | 'technician' }): Promise<ReadonlyArray<StoreProduct>> {
    const dtos = await drainPages<PublicProductDto>((page, limit) =>
      getApi()
        .request<PublicProductDto[]>('GET', `/products${buildQuery({ page, limit })}`)
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    return dtos.map(mapStoreProduct);
  }

  async getProduct(productId: string): Promise<StoreProduct | null> {
    try {
      const res = await getApi().request<PublicProductDto>('GET', `/products/${productId}`);
      return mapStoreProduct(res.data);
    } catch (err) {
      // The public contract returns an identical 404 for missing and
      // suspended products — surface both as "not found".
      if (err instanceof ApiClientError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }
}
