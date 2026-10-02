/**
 * Merchant active-tab resolution.
 *
 * The tab bar may only present a tab as active when the current route
 * actually belongs to that tab. Routes that are not themselves a tab
 * (onboarding, settings, product create/edit/detail) resolve to `null`
 * so no unrelated tab is misleadingly highlighted.
 *
 * Kept free of Expo Router imports so it stays unit-testable — mirrors
 * `customer-tab-routing.ts` and `technician-tab-routing.ts` exactly.
 */

export type MerchantTabId = 'home' | 'products' | 'messages' | 'profile';

export function tabIdForPathname(pathname: string): MerchantTabId | null {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname === '/products' || pathname.startsWith('/products/')) return 'products';
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return 'messages';
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile';
  // Not a tab route (onboarding, settings, notifications): no tab is active.
  return null;
}
