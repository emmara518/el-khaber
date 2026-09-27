/**
 * Technician active-tab resolution.
 *
 * The tab bar may only present a tab as active when the current route
 * actually belongs to that tab. Routes that are not themselves a tab
 * (onboarding, reviews, settings, the active-service execution screen)
 * resolve to `null` so no unrelated tab is misleadingly highlighted.
 *
 * Kept free of Expo Router imports so it stays unit-testable — mirrors
 * `customer-tab-routing.ts` exactly.
 */

export type TechnicianTabId = 'home' | 'orders' | 'services' | 'messages' | 'profile';

export function tabIdForPathname(pathname: string): TechnicianTabId | null {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname === '/orders' || pathname.startsWith('/orders/')) return 'orders';
  if (pathname === '/services' || pathname.startsWith('/services/')) return 'services';
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return 'messages';
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile';
  // Not a tab route (onboarding, reviews, settings, active-service):
  // no tab is active.
  return null;
}
