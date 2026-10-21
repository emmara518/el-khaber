/**
 * Pure display decision for a product's media (Phase C / C5).
 *
 * Kept free of React Native imports so it stays unit-testable in the
 * node test environment (the component `ProductImage` consumes it).
 *
 *   • no URL, or the image failed → truthful placeholder,
 *   • URL present and still loading → quiet skeleton,
 *   • URL present and loaded → the real image.
 */

export type ProductImageLoadState = 'loading' | 'loaded' | 'error';
export type ProductImageDisplay = 'placeholder' | 'skeleton' | 'image';

export function productImageDisplay(
  imageUrl: string | null,
  loadState: ProductImageLoadState,
): ProductImageDisplay {
  const uri = (imageUrl ?? '').trim();
  if (uri.length === 0 || loadState === 'error') return 'placeholder';
  return loadState === 'loaded' ? 'image' : 'skeleton';
}
