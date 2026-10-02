/**
 * Public store domain (Phase D).
 *
 * The store reads the public product contract (`GET /products`,
 * `GET /products/:id`) — the same active merchant products that are publicly
 * readable. Only fields the contract actually exposes are modeled; no
 * inventory/status/internal ids, no fabricated values.
 */

export interface StoreProduct {
  readonly id: string;
  readonly nameAr: string;
  readonly descriptionAr: string | null;
  readonly price: number | null;
  readonly imageUrl: string | null;
  /** Public merchant business name (nullable — shown only when present). */
  readonly merchantNameAr: string | null;
}

export interface StoreDataSource {
  getProducts(input: { role: 'customer' | 'technician' }): Promise<ReadonlyArray<StoreProduct>>;
  /** Null = not found / no longer publicly visible (identical 404). */
  getProduct(productId: string): Promise<StoreProduct | null>;
}
