import { describe, expect, it } from 'vitest';

import { mapStoreProduct } from './api-store-data-source';

import type { PublicProductDto } from '@khabir/shared-types';

function dto(overrides: Partial<PublicProductDto> = {}): PublicProductDto {
  return {
    id: 'p-1',
    nameAr: 'فلتر تكييف',
    slug: 'ac-filter',
    descriptionAr: 'فلتر قابل للغسل',
    price: 75,
    imageUrl: 'https://cdn.example/ac-filter.png',
    merchant: { businessNameAr: 'متجر الأول' },
    ...overrides,
  };
}

describe('mapStoreProduct (public store read model)', () => {
  it('maps the public product fields to the store model', () => {
    expect(mapStoreProduct(dto())).toEqual({
      id: 'p-1',
      nameAr: 'فلتر تكييف',
      descriptionAr: 'فلتر قابل للغسل',
      price: 75,
      imageUrl: 'https://cdn.example/ac-filter.png',
      merchantNameAr: 'متجر الأول',
    });
  });

  it('preserves truthful nulls (no fabricated fallbacks)', () => {
    const mapped = mapStoreProduct(
      dto({ descriptionAr: null, price: null, imageUrl: null, merchant: { businessNameAr: null } }),
    );
    expect(mapped.descriptionAr).toBeNull();
    expect(mapped.price).toBeNull();
    expect(mapped.imageUrl).toBeNull();
    expect(mapped.merchantNameAr).toBeNull();
  });
});
